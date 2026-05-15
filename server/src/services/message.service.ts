import { newMessageSchema, type NewMessageInput } from '../validation/message.js'
import { messageReads, messages,roomMembers, users } from '../db/schema.js'
import { db } from '../db/index.js'
import { eq, and, asc, ne } from 'drizzle-orm'
import { AppError } from '../utils/appError.js'

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

    const [messageWithUser] = await db.select({
                                    id: messages.id,
                                    roomId: messages.roomId,
                                    userId: messages.userId,
                                    message: messages.message,
                                    createdAt: messages.createdAt,
                                    user: {
                                        id: users.id,
                                        username: users.username,
                                        name: users.name,
                                        middleName: users.middleName,
                                        lastName: users.lastName,
                                    }
                                })
                                .from(messages)
                                .leftJoin(users, eq(messages.userId, users.id))
                                .where(eq(messages.id, newMessage.id))

    return messageWithUser || newMessage
}

export const markRoomMessagesAsRead = async (userId: number, roomId: number ) => {
    const [member] = await db.select()
                        .from(roomMembers)
                        .where(and(
                            eq(roomMembers.userId, userId),
                            eq(roomMembers.roomId, roomId)
                        ))

    if (!member) throw new AppError('You are not member of this room', 403)

    const roomMessages = await db.select({ id: messages.id})
                                 .from(messages)
                                 .where(
                                    and(
                                        eq(messages.roomId, roomId),
                                        ne(messages.userId, userId)
                                    )
                                 )
    
    if (roomMessages.length === 0) return []

    await db.insert(messageReads)
            .values(
                roomMessages.map((message) => ({
                    userId,
                    messageId: message.id
                }))
            )
            .onConflictDoNothing()

    const readReceipts = await Promise.all(
        roomMessages.map((message) => getMessageReadReceipt(userId, message.id))
    )

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

export const getMessageHistory = async (userId: number, roomId: number) => {
    const [member] = await db.select()
                            .from(roomMembers)
                            .where(and(
                                eq(roomMembers.userId, userId),
                                eq(roomMembers.roomId, roomId)
                            ))

    if (!member) throw new AppError('You are not a member of this room', 403)

    await markRoomMessagesAsRead(userId, roomId)

    const messageHistory = await db.query.messages.findMany({
        where: eq(messages.roomId, roomId),
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
        orderBy: asc(messages.createdAt)
    })
    return messageHistory
}
