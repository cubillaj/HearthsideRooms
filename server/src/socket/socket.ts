import { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import * as AuthService from '../services/auth.services.js'
import * as MessageService from '../services/message.service.js'
import * as RoomService from '../services/room.services.js'
import { verifyToken } from '../services/auth.services.js'
import { db } from '../db/index.js'
import { roomMembers} from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { roomSchema } from '../validation/room.validation.js'
let io: SocketIOServer | undefined
const onlineUsers = new Map<number, number>()

export const initSocket = (server: HttpServer): SocketIOServer => {
    const devMode = process.env.NODE_ENV !== 'production'

    io = new SocketIOServer(server, {
        cors: {
            origin: devMode ? ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'] : process.env.CLIENT_URL,
            credentials: true
        },
        transports: ['websocket', 'polling']
    })

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token

            if (!token) return  next(new Error('No socket auth token provided'))

            const decodedToken = verifyToken(token)
            const user = await AuthService.getUserById(decodedToken.userId)

            socket.data.user = user

            next()
        } catch (error) {
            next(new Error('Unauthorized'))
        }
    })
    

    io.on('connection', (socket) => {
        const userId = socket.data.user.id

        onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1)

        io?.emit('online_users', Array.from(onlineUsers.keys()))

        socket.on('join_room', async (roomId: number) => {
            try {
            const [roomMember] = await db.select()
                                        .from(roomMembers)
                                        .where(
                                            and(
                                                eq(roomMembers.userId, userId),
                                                eq(roomMembers.roomId, roomId)
                                            )
                                        )

            if (!roomMember) {
                socket.emit('join_room_error', {
                    message: 'You are not a member of this room'
                })
                return
            }

            socket.join(roomId.toString())

            socket.emit('joined_room', {
                roomId,
                message: 'Joined room successfully'
            })
            } catch (error) {
                socket.emit('join_room_error', {
                    message: 'Failed to join room'
                })
            }
        })

        socket.on('new_room', async (data: unknown) => {
            try {
                const parsed = roomSchema.safeParse(data)

                if (!parsed.success) {
                    socket.emit('room_error', {
                        message: 'Invalid room data'
                    })
                    return
                }

                const newRoom = await RoomService.createRoom(userId, parsed.data)

                io?.emit('room_created', newRoom)
            } catch(error) {
                socket.emit('room_error', {
                    message: 'Failed to create room'
                })
            }
        })

        socket.on('typing_start', async (roomId: number) => {
            try {
            const normalizedRoomId = Number(roomId)
            const roomMember = await RoomService.typeIndicator(userId, normalizedRoomId)

            if (!roomMember) return
            
            socket.to(normalizedRoomId.toString()).emit('user_typing', {
                roomId: normalizedRoomId,
                userId,
                username: socket.data.user.username || socket.data.user.name
            })

            } catch (error) {
                socket.emit('typing_error', {
                    message: 'Type indicator error'
                })
            }
        })

        socket.on('typing_stop', async (roomId: number) => {
            const normalizedRoomId = Number(roomId)

            socket.to(normalizedRoomId.toString()).emit('user_stopped_typing', {
                roomId: normalizedRoomId,
                userId
            })
        })

        socket.on('new_message', async (payload) => {
            try {
                const newMessage = await MessageService.createMessage(
                    userId,
                    Number(payload.roomId),
                    { message: payload.message}
                )

                io?.to(newMessage.roomId.toString()).emit('receive_message', newMessage)
            } catch (error) {
                socket.emit('message_error', {
                    message: 'Failed to send message'
                })
            }
        })

        socket.on('mark_message_read', async (payload) => {
            try {
                const receipt = await MessageService.markMessageAsRead(userId, Number(payload.messageId))

                if (receipt) {
                    io?.to(Number(payload.roomId).toString()).emit('message_read_receipt', receipt)
                }
            } catch (error) {
                socket.emit('message_error', {
                    message: 'Failed to mark message as read'
                })
            }
        })

        socket.on('mark_room_read', async (roomId: number) => {
            try {
                const receipts = await MessageService.markRoomMessagesAsRead(userId, Number(roomId))

                receipts.forEach((receipt) => {
                    io?.to(Number(roomId).toString()).emit('message_read_receipt', receipt)
                })
            } catch (error) {
                socket.emit('message_error', {
                    message: 'Failed to mark room as read'
                })
            }
        })

        socket.on('disconnect', () => {
            const count = onlineUsers.get(userId) || 0

            if (count <= 1) {
                onlineUsers.delete(userId)
            } else {
                onlineUsers.set(userId, count - 1)
            }

            io?.emit('online_users', Array.from(onlineUsers.keys()))
        })
    })


    return io
}

export const getIo = (): SocketIOServer => {
    if (!io) throw new Error('Socket.io is not initialized')
    
    return io
}

export const emitRoomCreated = (room: unknown) => {
    getIo().emit('room_created', room)
}
