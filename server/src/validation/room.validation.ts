import { z } from 'zod'

export const roomSchema = z.object({
    roomName: z.string().min(1, 'Room name is required'),
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

export type RoomSchema =  z.infer<typeof roomSchema>
export type RoomMemberSchema = z.infer<typeof roomMembersSchema>
export type RoomPasswordSchema = z.infer<typeof roomPasswordSchema>