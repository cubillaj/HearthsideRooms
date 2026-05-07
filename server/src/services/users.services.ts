import { users } from "../db/schema.js";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { AppError } from "../utils/appError.js";
import {UpdateMyProfileSchema, updateMyProfileSchema, userSchema, UserSchema, changePasswordSchema, ChangePasswordSchema, adminCreateUserSchema, AdminCreateUserSchema} from '../validation/user.validation.js'
import { comparePassword, hashPassword } from "./auth.services.js";

export const userProfile = async (userId: number) => {

    const [user] = await db.select({
        email: users.email,
        username: users.username,
        name: users.name,
        lastName: users.lastName,
        middleName: users?.middleName,
    }).from(users).where(eq(users.id, userId))

    if (!user) throw new AppError('User not found', 404)

    return user
}

export const updateMyProfile = async (userId: number, data: UpdateMyProfileSchema) => {
    const parsed = updateMyProfileSchema.safeParse(data)

    if (!parsed.success) throw new AppError('Invalid data', 400)
    
    const updateData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, v]) => v !== undefined)
    )
    
    if (Object.keys(updateData).length === 0) {
        throw new AppError('No fields to update', 400)
    }
    
    const [updatedUser] = await db.update(users)
                .set(parsed.data)
                .where(eq(users.id, userId))
                .returning({
                    id: users.id,
                    email: users.email,
                    username: users.username,
                    name: users.name,
                    lastName: users.lastName,
                    middleName: users.middleName,
                })

    if (!updatedUser) throw new AppError('User not found', 404)

    return updatedUser
}

export const changeMyPassword = async (userId: number, data: ChangePasswordSchema) => {
    const parsed = changePasswordSchema.safeParse(data)

    if (!parsed.success) throw new AppError('Invalid data', 400)
    
    const [user] = await db.select({ id: users.id, password: users.password }).from(users).where(eq(users.id, userId))

    if (!user) throw new AppError('User not found', 404)
    
    const validPassword = await comparePassword(parsed.data.currentPassword, user.password)

    if (!validPassword) throw new AppError('Incorrect current password', 401)

    const samePassword = await comparePassword(parsed.data.password, user.password)

    if (samePassword) throw new AppError('New password must be different from current password', 400)
    
    const hashedPassword = await hashPassword(parsed.data.password)

    const [updatedUser] = await db.update(users)
                                    .set({password: hashedPassword})
                                    .where(eq(users.id, user.id))
                                    .returning({ id: users.id})

    if (!updatedUser) throw new AppError('Failed to change password', 400)

    return updatedUser
}


export const createUserAccount = async (data: AdminCreateUserSchema) => {

        const {email, username, role, password, lastName, middleName, name} = data

        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email)
        })

        if (existingUser) throw new AppError('User is already exists', 409)

        const hasedPassword = await hashPassword(password)

        const [newUser] = await db.insert(users).values({
            username,
            email,
            name,
            lastName,
            middleName,
            password: hasedPassword,
            role: role || 'user'
        })
        .returning({
            id: users.id,
            username: users.username,
            lastName: users.lastName,
            middleName: users.middleName,
            email: users.email,
            name: users.name
        })

        if (!newUser) throw new AppError('Failed to create user', 400)

        return newUser
}

export const createAccountByAdmin = async (data: unknown) => {
    const parsed = adminCreateUserSchema.safeParse(data)

    if (!parsed.success) throw new AppError('Invalid data', 400)

    return createUserAccount(parsed.data)
}