import { z } from "zod";

export const tokenSchema = z.object({
    userId: z.number().int(),
    token: z.string(),
    expiresAt: z.date(),
})

export type TokenSchema = z.infer<typeof tokenSchema>
