import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { users, refreshTokens } from "../db/schema.js";
import { eq, and, gt } from "drizzle-orm";
import jwt from 'jsonwebtoken'
import * as tokenValidation from '../validation/token.validation.js'
import * as userValidation from '../validation/user.validation.js'
import * as UserService from '../services/users.services.js'
import { randomBytes } from "node:crypto";
import { AppError } from "../utils/appError.js";
import { validationMessage } from "../utils/zodValidationError.js";

const JWT_SECRET: any = process.env.JWT_SECRET 
const JWT_EXPIRES_IN: any = process.env.EXPIRES_IN || '15m'

// hash the password ex random letter and number
export const hashPassword = (password: string) => {
    return bcrypt.hash(password, 12)
}

// compare the password that user input to the hash password
export const comparePassword = (inputPassword: string, userPassword: string) => {
    return bcrypt.compare(inputPassword, userPassword)
}

// sign the user id in the jwt
export const signToken = (userId: number) => {
    return jwt.sign({ userId}, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN} as any)
}

// verify the token if it is valid
export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET) as any
}

export const getUserById = async (userId: number) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user) throw new AppError('User not found', 404)

    const { password: _, ...safeUser} = user

    return safeUser
}

// refresh token long lived stored in db + httpOnly cookie
export const createRefreshToken = async (userId: number) => {
    await revokeAllUserTokens(userId) // ensure one active refresh token per user for better security

    const token = randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 day   
    
    const parsed = tokenValidation.tokenSchema.safeParse({ userId, token, expiresAt})

    if (!parsed.success) throw new AppError('Invalid data', 400)

    const { userId: id, token: validatedToken, expiresAt: validatedExpiresAt } = parsed.data as any

    await db.insert(refreshTokens).values(
        { userId: id, token: validatedToken, expiresAt: validatedExpiresAt, createdAt: new Date()  }
    )

    return validatedToken
}

// remove the refresh token in the database
export const revokeRefreshToken = async (token: string) => {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token))
}

// to remove refresh token on a specific user
export const revokeAllUserTokens = async (userId: number) => {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}

export const rotateRefreshToken = async (oldToken: string) => {

    // find the old token and make sure it is not expired
    const [existing] = await db.select()
                                    .from(refreshTokens)
                                    .where(
                                        and(
                                            eq(refreshTokens.token, oldToken),
                                            gt(refreshTokens.expiresAt, new Date())
                                        )
                                    )
                                    .limit(1)

    if (!existing) throw new AppError('Invalid or expired refresh token', 409)

    // delete the old one (rotation - each refresh token is single-use)
    await db.delete(refreshTokens).where(eq(refreshTokens.token, oldToken))

    // issue a new one
    const newToken = await createRefreshToken(existing.userId)

    return { userId: existing.userId, newToken}
}

export const register = async (data: unknown) => {
   const parsed = userValidation.registerUserSchema.safeParse(data)

   if (!parsed.success) {
     const errors = parsed.error.flatten().fieldErrors
     const msgVal = Object.values(errors).flat()[0] || 'Invalid data'

     console.log(msgVal)
     throw new AppError(msgVal, 400)
   }

   return UserService.createUserAccount(parsed.data)
}

export const login = async (data: unknown) => {
    const parsed = userValidation.loginSchema.safeParse(data)

    if (!parsed.success) throw new AppError('Invalid data', 400)

    const { email, password } = parsed.data as any

    const [user] = await db.select().from(users).where(eq(users.email, email))

    if(!user) throw new AppError('Invalid Credentials', 401)

    const validPassword = await comparePassword(password, user.password)

    if (!validPassword) throw new AppError('Invalid Credentials', 401)
    
    const { password: _, ...safeUser} = user

    const token = signToken(user.id)

    return {user: safeUser, token}
}
