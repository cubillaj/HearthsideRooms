import { z } from 'zod'

export const roomSchema = z.object({
    roomName: z.string({ error: 'Room name is required'}).min(1, 'Room name is required'),
    roomPassword: z.string().optional(),
})

export const roomMembersSchema = z.object({
    userId: z.coerce.number().int(),
    roomId: z.coerce.number().int(),
    joinedAt: z.date()
})

export const roomPasswordSchema = roomSchema.pick({
    roomPassword: true
})
.partial()

export const GetQueryRoomSchema = z.object({
    search: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).default(10),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    sortBy: z.enum(['createdAt']).default('createdAt'),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional()
})

export const GetRoomSchema = z.object({
    roomId: z.coerce.number().min(1)
})

export const DeleteRoomSchema = z.object({
    roomId: z.coerce.number().min(1)
})

export type RoomSchema =  z.infer<typeof roomSchema>
export type RoomMemberSchema = z.infer<typeof roomMembersSchema>
export type RoomPasswordSchema = z.infer<typeof roomPasswordSchema>
export type GetRoomQuerySchema = z.infer<typeof GetQueryRoomSchema>
export type GetSingleRoomSchema = z.infer<typeof GetRoomSchema>
export type DeleteSingleRoomSchema = z.infer<typeof DeleteRoomSchema>