import { MessageHistoryQuerySchema, newMessageSchema, type NewMessageInput } from '../validation/message.js'
import { messageReads, messages,roomMembers, users } from '../db/schema.js'
import { db } from '../db/index.js'
import { eq, and, asc, ne, SQL, ilike, gte, lte, desc, sql, isNull, inArray } from 'drizzle-orm'
import { AppError } from '../utils/appError.js'
import { redis } from '../redis/redis.js'

async function clearRoomMessageHistoryCache(roomId: number) {
    const keys = [
        ...await redis.keys(`messageHistory:${roomId}:*`),
        ...await redis.keys(`messageHistory:${roomId}*`)
    ]

    if (keys.length > 0) {
        await redis.del([...new Set(keys)])
    }
}

export const createMessage = async (userId: number, roomId: number, data: NewMessageInput) => {
    const parsed = newMessageSchema.safeParse(data)

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msgVal = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msgVal, 400)
    }

    const member = await db.query.roomMembers.findFirst({
        where: and(
            eq(roomMembers.roomId, roomId),
            eq(roomMembers.userId, userId)
        ),
        with: {
            user: {
                columns: {
                    id: true,
                    username: true,
                    name: true,
                    middleName: true,
                    lastName: true,
                    status: true
                }
            }
        }
    })

    if (!member) {
        throw new AppError('You are not member of this room', 400)
    } else if (member.user.status !== 'active') {
        throw new AppError('Your account is not active', 403)
    }
    
    const [newMessage] = await db.insert(messages).values({
        userId,
        roomId,
        message: parsed.data.message
    })
    .returning({
        id: messages.id,
        userId: messages.userId,
        roomId: messages.roomId,
        message: messages.message,
        createdAt: messages.createdAt
    })

    if (!newMessage) throw new AppError('Failed to send a message', 400)

    await clearRoomMessageHistoryCache(roomId)

    return {
        ...newMessage,
        user: {
            id: member.user.id,
            username: member.user.username,
            name: member.user.name,
            middleName: member.user.middleName,
            lastName: member.user.lastName,
        }
    }
}

export const markRoomMessagesAsRead = async (userId: number, roomId: number, messageIds?: number[] ) => {
    const [member] = await db.select()
                        .from(roomMembers)
                        .where(and(
                            eq(roomMembers.userId, userId),
                            eq(roomMembers.roomId, roomId)
                        ))

    if (!member) throw new AppError('You are not member of this room', 403)

    const filters: SQL[] = [
        eq(messages.roomId, roomId),
        ne(messages.userId, userId)
    ]

    if (messageIds?.length) {
        filters.push(inArray(messages.id, messageIds))
    }

    const roomMessages = await db.select({ id: messages.id})
                                 .from(messages)
                                 .leftJoin(
                                    messageReads,
                                    and(
                                        eq(messageReads.userId, userId),
                                        eq(messageReads.messageId, messages.id)
                                    )
                                 )
                                 .where(and(...filters, isNull(messageReads.messageId)))
    
    if (roomMessages.length === 0) return []

    await db.insert(messageReads)
            .values(
                roomMessages.map((message) => ({
                    userId,
                    messageId: message.id
                }))
            )
            .onConflictDoNothing()

    await clearRoomMessageHistoryCache(roomId)

    const readReceipts = await db.select({
                                messageId: messageReads.messageId,
                                readAt: messageReads.readAt,
                                user: {
                                    id: users.id,
                                    username: users.username
                                }
                            })
                            .from(messageReads)
                            .leftJoin(users, eq(messageReads.userId, users.id))
                            .where(and(
                                eq(messageReads.userId, userId),
                                inArray(messageReads.messageId, roomMessages.map((message) => message.id))
                            ))

    return readReceipts.filter(Boolean)
}

export const markMessageAsRead = async (userId: number, messageId: number) => {
    const [message] = await db.select({
                                id: messages.id,
                                roomId: messages.roomId,
                                userId: messages.userId,
                            })
                            .from(messages)
                            .where(eq(messages.id, messageId))

    if (!message) throw new AppError('Message not found', 404)

    const [member] = await db.select()
                        .from(roomMembers)
                        .where(and(
                            eq(roomMembers.userId, userId),
                            eq(roomMembers.roomId, message.roomId)
                        ))

    if (!member) throw new AppError('You are not member of this room', 403)

    if (message.userId === userId) return null

    await db.insert(messageReads)
            .values({
                userId,
                messageId
            })
            .onConflictDoNothing()

    await clearRoomMessageHistoryCache(message.roomId)

    return getMessageReadReceipt(userId, messageId)
}

const getMessageReadReceipt = async (userId: number, messageId: number) => {
    const [receipt] = await db.select({
                                messageId: messageReads.messageId,
                                readAt: messageReads.readAt,
                                user: {
                                    id: users.id,
                                    username: users.username
                                }
                            })
                            .from(messageReads)
                            .leftJoin(users, eq(messageReads.userId, users.id))
                            .where(and(
                                eq(messageReads.userId, userId),
                                eq(messageReads.messageId, messageId)
                            ))

    return receipt
}

export const getMessageHistory = async (userId: number, roomId: number, queryData: unknown) => {
    const [member] = await db.select()
                            .from(roomMembers)
                            .where(and(
                                eq(roomMembers.userId, userId),
                                eq(roomMembers.roomId, roomId)
                            ))

    if (!member) throw new AppError('You are not a member of this room', 403)

    const parsed = MessageHistoryQuerySchema.safeParse(queryData)

    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors
        const msgVal = Object.values(errors).flat()[0] || 'Invalid data'

        throw new AppError(msgVal, 400)
    }

    const { search, limit, page, createdFrom, createdTo, sortBy, sortOrder} = parsed.data

    const filters: SQL[] = [
        eq(messages.roomId, roomId)
    ]

    if (search) {
        const searchFilter = ilike(messages.message, `%${search}%`)

        if (searchFilter) {
            filters.push(searchFilter)
        }
    }

    if (createdFrom) {
        filters.push(gte(messages.createdAt, createdFrom))
    }

    if (createdTo) {
        filters.push(lte(messages.createdAt, createdTo))
    }

    const sortColumn = {
        createdAt: messages.createdAt
    }[sortBy]
    
    const orderBy = 
        sortOrder === 'asc'
            ? asc(sortColumn)
            : desc(sortColumn)

    const offset = (page - 1) * limit

    const cacheKey = `messageHistory:${roomId}:${JSON.stringify(parsed.data)}`
    const cachedMessageHistroy = await redis.get(cacheKey)

    if(cachedMessageHistroy) {
        return {
            ...JSON.parse(cachedMessageHistroy),
            source: 'redis-cache'
        }
    }

    const messageHistory = await db.query.messages.findMany({
        where: and(...filters),
        orderBy,
        limit, 
        offset,
        columns: {
            id: true,
            roomId: true,
            userId: true,
            message: true,
            createdAt: true
        },
        with: {
            user: {
                columns: {
                    id: true,
                    username: true,
                    name: true
                }
            },
            messageReads: {
                columns: {
                     readAt: true
                },
                with: {
                    user: {
                        columns: {
                            id: true,
                            username: true
                        }
                    }
                }
            }
        },
    })

    const orderedMessageHistory =
        sortOrder === 'desc'
            ? [...messageHistory].reverse()
            : messageHistory

    const [{count}] = await db
                            .select({ count: sql<number>`count(*)`})
                            .from(messages)
                            .where(and(...filters))

    const total = Number(count)
    const totalPages = Math.ceil(total / limit)
    const result =  {
        messages: orderedMessageHistory,
        source: 'neon',
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    }

    await redis.set(cacheKey, JSON.stringify(result), {
        EX: 60
    })

    return result
}
