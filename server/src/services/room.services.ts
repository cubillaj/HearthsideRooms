import { roomMembers, rooms, users } from "../db/schema.js";
import { db } from "../db/index.js";
import { RoomPasswordSchema, roomPasswordSchema, RoomSchema, roomSchema } from "../validation/room.validation.js";
import { AppError } from "../utils/appError.js";
import { and, eq } from "drizzle-orm";
import { comparePassword, hashPassword } from "./auth.services.js";

export const createRoom = async (userId: number, data: RoomSchema) => {
    const parsed = roomSchema.safeParse(data)

    if (!parsed.success) throw new AppError('Invalid data', 400)
    
    const { roomName, roomPassword} = parsed.data

    const [existingRoom] = await db.select().from(rooms).where(eq(rooms.roomName, parsed.data.roomName))

    if (existingRoom) throw new AppError('Room already exists', 400)
    
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user) throw new AppError('User not found', 404)

    const hasedRoomPassword = roomPassword ? await hashPassword(roomPassword) : null

    const [newRoom] = await db.insert(rooms).values({ roomName, roomPassword: hasedRoomPassword, createdBy: user.id }).returning({id: rooms.id, room: rooms.roomName})

    if (!newRoom) throw new AppError('Failed to create new room', 400)
    
    await db.insert(roomMembers).values({
        userId,
        roomId: newRoom.id
    })

    return newRoom
}

export const joinRoom = async (userId: number, roomId: number, roomPassword: RoomPasswordSchema ) => {

    const parsed = roomPasswordSchema.safeParse(roomPassword)

    if (!parsed.success) throw new AppError('Invalid data', 400)

    const existingRoom = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomId),
        columns: {
            createdAt: false,
            updatedAt: false
        },
        with: {
            roomMembers: true,
            creator: {
                columns: {
                    username: true
                }
            }
        }
    })

    if (!existingRoom) throw new AppError('Room not found', 404)

    const [existingMember] = await db.select()
        .from(roomMembers)
        .where(
            and(
                eq(roomMembers.userId, userId),
                eq(roomMembers.roomId, existingRoom.id)
            )
        )

    if (existingMember) {
        const { roomPassword: _, ...safeRoom } = existingRoom

        return safeRoom
    }
    
    // if the room has a password check if the input password is match to room password
    if (existingRoom.roomPassword) {
        if (!parsed.data?.roomPassword) {
            throw new AppError('Room password is required', 400)
        }

        const validPassword = await comparePassword(parsed.data?.roomPassword, existingRoom.roomPassword)

        if (!validPassword) throw new AppError('Incorrect room password', 401)
    }

    await db.insert(roomMembers).values({
        userId,
        roomId: existingRoom.id
    })

    const { roomPassword: _, ...safeRoom} = existingRoom

    return safeRoom
}

export const getMyRoom = async (userId: number) => {
    const myRooms = await db.query.roomMembers.findMany({
        where: eq(roomMembers.userId, userId),
        columns: {
            joinedAt: true
        },
        with: {
            room: {
                columns: {
                    id: true,
                    roomName: true,
                    createdBy: true,
                    roomPassword: true
                },
                with: {
                    creator: {
                        columns: {
                            id: true,
                            username: true
                        }
                    }
                }
            }
        }
    })

    return myRooms.map((member) => {
        const { roomPassword, ...safeRoom } = member.room

        return {
            ...safeRoom,
            hasPassword: Boolean(roomPassword),
            joinedAt: member.joinedAt
        }
    })
}

export const getAllRooms = async () => {
    const allRooms = await db.query.rooms.findMany({
        columns: {
            id: true,
            roomName: true,
            createdBy: true,
            createdAt: true,
            roomPassword: true
        },
        with: {
            creator: {
                columns: {
                    id: true,
                    username: true
                }
            }
        }
    })

    return allRooms.map((room) => {
        const { roomPassword, ...safeRoom } = room

        return {
            ...safeRoom,
            hasPassword: Boolean(roomPassword)
        }
    })
}

export const typeIndicator = async (userId: number, roomId: number) => {
    const member = await db.query.roomMembers.findFirst({
        where: and(eq(roomMembers.userId, userId), eq(roomMembers.roomId, roomId))
    })

    if (!member) throw new AppError('You are not member of this room', 403)

    return member
}
