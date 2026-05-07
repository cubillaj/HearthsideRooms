import { z} from "zod"

export const userSchema = z.object({
    username: z.string().min(1).optional(),
    name: z.string().min(1, 'Name is required'),
    middleName: z.string().min(1).optional(),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email format').transform(value => value.toLowerCase()),
    password: z.string()
                .min(8, 'Password length must be at least 8 letters')
                .refine(value => /[A-Z]/.test(value), {
                        message: 'Must include uppercase'
                })  
                .refine(value => /[!@#$%^&*(),.?":{}|<>]/.test(value), {
                    message: 'Must include at least one symbol. [!@#$%^&*(),.?":{}|<>]'
                })
    })

export const registerUserSchema = userSchema

export const adminCreateUserSchema = userSchema.extend({
    role: z.enum(['super_admin', 'user']).optional()
})

export const loginSchema = z.object({
    email: z.string().trim().min(1, 'Email is required').email('Invalid email format').transform(value => value.toLowerCase()),
    password: z.string().min(1, 'Password is required')
})

export const updateMyProfileSchema = userSchema.pick({
    username: true,
    lastName: true,
    middleName: true,
    name: true
})
.partial()

export const changePasswordSchema = userSchema.pick({
    password: true
})
.extend({
    currentPassword: z.string().min(1, 'Input current password')
})

export type UserSchema = z.infer<typeof userSchema>
export type UpdateMyProfileSchema = z.infer<typeof updateMyProfileSchema>
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>
export type LoginSchema = z.infer<typeof loginSchema>
export type RegisterUserSchema = z.infer<typeof registerUserSchema>
export type AdminCreateUserSchema = z.infer<typeof adminCreateUserSchema>
