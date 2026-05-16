import { z } from 'zod'

export const newMessageSchema = z.object({
    message: z.string().min(1, 'Message is required'),
})

export const MessageHistoryQuerySchema = z.object({
    search: z.string().optional(),
    page: z.coerce.number( {error: 'Page cannot be negative'}).min(1, 'Page cannot be negative').default(1),
    limit: z.coerce.number( {error: 'Limit cannot be negative'}).min(1, 'Limit cannot be negative').default(50),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    sortBy: z.enum(['createdAt']).default('createdAt'),
    createdFrom: z.coerce.date().optional(),
    createdTo: z.coerce.date().optional()
})

export type NewMessageInput = z.infer<typeof newMessageSchema>
export type MessageHistoryQuery = z.infer<typeof MessageHistoryQuerySchema>