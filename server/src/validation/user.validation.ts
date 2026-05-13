import { z} from "zod"

export const userSchema = z.object({
    username: z.string().min(1).optional(),
    name: z.string({ error: 'Name is required' }).min(1, 'Name is required'),
    middleName: z.string().min(1).optional(),
    lastName: z.string({ error: 'Last name is required' }).min(1, 'Last name is required'),
    email: z.string({ error: 'Email is required' }).trim().min(1, 'Email is required').email('Invalid email format').transform(value => value.toLowerCase()),
    password: z.string({ error: 'Password is required' })
                .min(8, 'Password length must be at least 8 letters')
                .refine(value => /[A-Z]/.test(value), {
                        message: 'Must include uppercase'
                })  
                .refine(value => /[a-z]/.test(value), {
                        message: 'Must include lowercase'
                })  
                .refine(value => /[!@#$%^&*(),.?":{}|<>]/.test(value), {
                    message: 'Must include at least one symbol. [!@#$%^&*(),.?":{}|<>]'
                })
                .refine(value => /[0-9]/.test(value), {
                    message: 'Must include at least one number.'
                }),
    status: z.enum(['active', 'inactive']).optional()
    })

export const registerUserSchema = userSchema

export const adminCreateUserSchema = userSchema.extend({
    role: z.enum(['super_admin', 'user']).optional()
})

export const loginSchema = z.object({
    email: z.string({ error: 'Email is required' }).trim().min(1, 'Email is required').email('Invalid email format').transform(value => value.toLowerCase()),
    password: z.string({ error: 'Password is required' }).min(1, 'Password is required')
})

export const updateMyProfileSchema = userSchema.pick({
    username: true,
    lastName: true,
    middleName: true,
    name: true,
    status: true
})
.partial()

export const changePasswordSchema = userSchema.pick({
    password: true
})
.extend({
    currentPassword: z.string({ error: 'Input current password' }).min(1, 'Input current password')
})

export const UpdateUserSchema = userSchema.pick({
    username: true,
    name: true,
    email: true,
    lastName: true,
    middleName: true
})
.partial()

export const UpdateUserPasswordSchema = userSchema.pick({
    password: true
})

export const GetUsersQuerySchema = z.object({
    search: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),
    sortBy: z
        .enum(['createdAt', 'email', 'name'])
        .default('createdAt'),
    sortOrder: z
        .enum(['asc', 'desc'])
        .default('desc'),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional()
})

export const UpdateProfileSchema = z.object({
    profileUrl: z.string().url('Profile image must be a valid URL').optional(),
    bio: z.string().max(150, 'Bio must be 150 characters or less').optional()
})

export type UserSchema = z.infer<typeof userSchema>
export type UpdateMyProfileSchema = z.infer<typeof updateMyProfileSchema>
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>
export type LoginSchema = z.infer<typeof loginSchema>
export type RegisterUserSchema = z.infer<typeof registerUserSchema>
export type AdminCreateUserSchema = z.infer<typeof adminCreateUserSchema>
export type UpdateSchema = z.infer<typeof UpdateUserSchema>
export type ChangeUserPasswordSchema = z.infer<typeof UpdateUserPasswordSchema>
export type UsersQuerySchema = z.infer<typeof GetUsersQuerySchema>
export type ProfileSchema = z.infer<typeof UpdateProfileSchema>
