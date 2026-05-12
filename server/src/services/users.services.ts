import { users } from "../db/schema.js";
import { db } from "../db/index.js";
import {
    and,
    asc,
    desc,
    eq,
    ilike,
    ne,
    or,
    gte,
    lte
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { AppError } from "../utils/appError.js";
import {UpdateMyProfileSchema, updateMyProfileSchema, changePasswordSchema, ChangePasswordSchema, adminCreateUserSchema, AdminCreateUserSchema, UpdateUserSchema, GetUsersQuerySchema} from '../validation/user.validation.js'
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

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msgVal = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msgVal, 400)
    }

    return createUserAccount(parsed.data)
}

// for admin get all users
export const getAllUsers = async (query: unknown) => {
    const parsed = GetUsersQuerySchema.safeParse(query)

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msgVal = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msgVal, 400)
    }

    const {search, status, createdTo, createdFrom, page, limit, sortBy, sortOrder} = parsed.data

    const filters: SQL[] = [
        ne(users.role, 'super_admin')
    ]

    if (search) {
        const searchFilter = or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.username, `%${search}%`)
        )

        if (searchFilter) {
            filters.push(searchFilter)
        }
    }

    if (status) {
        filters.push(eq(users.status, status))
    }

    if (createdFrom) {
        filters.push(gte(users.createdAt, createdFrom))
    }

    if (createdTo) {
        filters.push(lte(users.createdAt, createdTo))
    }

    const sortColumn = {
        name: users.name,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt
    }[sortBy]

    const orderBy =
        sortOrder === 'asc'
            ? asc(sortColumn)
            : desc(sortColumn)

    const offset = (page - 1) * limit


    const allUsers = await db.query.users.findMany({
        where: and(...filters),
        orderBy,
        limit,
        offset,
        columns: {
            updatedAt: false,
            password: false,
            role: false
        }
    })

    if (allUsers.length === 0) return []
    
    return allUsers
}

// get specific user
export const getUser = async (userId: number) => {
    const user = await db.query.users.findFirst({
        where: and(
            eq(users.id, userId),
            ne(users.role, 'super_admin')
        ),
        columns: {
            password: false,
            updatedAt: false,
            role: false
        }
    })

    if (!user) throw new AppError('User not found', 404)

    return user
}

// update specific user
export const updateUser = async (userId: number, data: unknown) => {
    const parsed = UpdateUserSchema.safeParse(data)

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msgVal: any = Object.values(errors).flat()[0] || 'Invalid Data'

        throw new AppError(msgVal, 400)
    }

    const updateData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(updateData).length === 0) {
        throw new AppError('No fields to update', 400)
    }

    const existing = await db.query.users.findFirst({
        where: and(
            eq(users.id, userId),
            ne(users.role, 'super_admin')
        )
    })

    if (!existing) throw new AppError('User not found', 404)

    if (updateData.email) {
        const emailOwner = await db.query.users.findFirst({
            where: and(
                eq(users.email, updateData.email as string),
                ne(users.id, userId)
            )
        })

        if (emailOwner) throw new AppError('Email is already exists', 409)
    }

    const [updatedUser] = await db.update(users).set(updateData)
    .where(eq(users.id, existing.id))
    .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        middleName: users.middleName,
        lastName: users.lastName,
        status: users.status
    })

    if (!updatedUser) throw new AppError('Failed to update user', 400)

    return updatedUser
}

export const deleteUser = async (userId: number) => {
    const [deletedUser] = await db.delete(users).where(and(
                                                eq(users.id, userId), 
                                                ne(users.role, 'super_admin')
                                            )).returning()

    if (!deletedUser) throw new AppError('User not found', 404)

    return deletedUser
}
