import { z } from 'zod'

export const newMessageSchema = z.object({
    message: z.string().min(1, 'Message is required'),
})

export type NewMessageInput = z.infer<typeof newMessageSchema>
