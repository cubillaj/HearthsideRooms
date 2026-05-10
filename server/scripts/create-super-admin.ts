import 'dotenv/config'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import * as schema from '../src/db/schema.js'
import { users } from '../src/db/schema.js'
import { adminCreateUserSchema } from '../src/validation/user.validation.js'

type Args = Record<string, string | undefined>

const parseArgs = (argv: string[]): Args => {
    const args: Args = {}

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index]

        if (!arg.startsWith('--')) continue

        const [key, inlineValue] = arg.slice(2).split('=')
        const nextValue = argv[index + 1]

        if (inlineValue !== undefined) {
            args[key] = inlineValue
        } else if (nextValue && !nextValue.startsWith('--')) {
            args[key] = nextValue
            index++
        } else {
            args[key] = 'true'
        }
    }

    return args
}

const args = parseArgs(process.argv.slice(2))

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    console.error('DATABASE_URL is required.')
    process.exit(1)
}

const rawAdmin = {
    username: args.username ?? process.env.SUPER_ADMIN_USERNAME ?? 'superadmin',
    name: args.name ?? process.env.SUPER_ADMIN_NAME ?? 'Super',
    middleName: args.middleName ?? process.env.SUPER_ADMIN_MIDDLE_NAME,
    lastName: args.lastName ?? process.env.SUPER_ADMIN_LAST_NAME ?? 'Admin',
    email: args.email ?? process.env.SUPER_ADMIN_EMAIL,
    password: args.password ?? process.env.SUPER_ADMIN_PASSWORD,
    role: 'super_admin' as const
}

const parsed = adminCreateUserSchema.safeParse(rawAdmin)

if (!parsed.success) {
    console.error('Invalid super admin data:')
    console.error(parsed.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n'))
    process.exit(1)
}

const pool = new Pool({
    connectionString,
    idleTimeoutMillis: 3000,
    max: 1
})

const db = drizzle(pool, { schema })

try {
    const { email, username, name, middleName, lastName, password, role } = parsed.data
    const hashedPassword = await bcrypt.hash(password, 12)

    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email)
    })

    if (existingUser) {
        const [updatedUser] = await db.update(users)
            .set({
                username,
                name,
                middleName,
                lastName,
                password: hashedPassword,
                role
            })
            .where(eq(users.email, email))
            .returning({
                id: users.id,
                email: users.email,
                username: users.username,
                name: users.name,
                middleName: users.middleName,
                lastName: users.lastName,
                role: users.role
            })

        console.log('Super admin updated:')
        console.table([updatedUser])
    } else {
        const [newUser] = await db.insert(users)
            .values({
                username,
                name,
                middleName,
                lastName,
                email,
                password: hashedPassword,
                role
            })
            .returning({
                id: users.id,
                email: users.email,
                username: users.username,
                name: users.name,
                middleName: users.middleName,
                lastName: users.lastName,
                role: users.role
            })

        console.log('Super admin created:')
        console.table([newUser])
    }
} catch (error) {
    console.error('Failed to create super admin.')
    console.error(error)
    process.exitCode = 1
} finally {
    await pool.end()
}
