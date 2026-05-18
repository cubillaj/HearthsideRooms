import { NextFunction, Request, Response } from "express";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "../redis/redis.js";

type RateLimiterOptions = {
    keyPrefix: string;
    points: number;
    duration: number;
    message: string;
}

function createRedisRateLimiter({ keyPrefix, points, duration, message }: RateLimiterOptions) {
    const limiter = new RateLimiterRedis({
        storeClient: redis,
        useRedisPackage: true,
        keyPrefix,
        points,
        duration
    })

    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
        const key = req.user?.id ? `${ip}:${req.user.id}` : ip

        try {
            await limiter.consume(key)
            next()
        } catch (error) {
            if (!(error instanceof RateLimiterRes)) {
                next(error)
                return
            }

            return res.status(429).json({ message })
        }
    }
}

// for login attempt
export const authRateLimiter = createRedisRateLimiter({
    keyPrefix: 'auth',
    points: 15,
    duration: 15 * 60,
    message: 'Too many login attempts. Please try again after 15 minutes'
})

export const registerRateLimiter = createRedisRateLimiter({
    keyPrefix: 'register',
    points: 5,
    duration: 60 * 60,
    message: 'Too many registration attempts. Try again later.'
})

export const createRoomLimiter = createRedisRateLimiter({
    keyPrefix: 'create_room',
    points: 5,
    duration: 10 * 60,
    message: 'Too many request. Try again after 10 minutes.'
})

export const messageLimiter = createRedisRateLimiter({
    keyPrefix: 'message',
    points: 60,
    duration: 60,
    message: "You're sending messages too quickly. Please slow down."
})

export const joinRoomRateLimiter = createRedisRateLimiter({
    keyPrefix: 'join_room',
    points: 10,
    duration: 15 * 60,
    message: 'Too many attempts to join room. Try again after 15 minutes.'
})

export const changePasswordRateLimiter = createRedisRateLimiter({
    keyPrefix: 'change_password',
    points: 10,
    duration: 10 * 60,
    message: 'Too many password change attempts. Try again after 10 minutes.'
})

export const createAccountRateLimiter = createRedisRateLimiter({
    keyPrefix: 'create_account',
    points: 10,
    duration: 60,
    message: 'Too many account creation attempts. Try again after 1 minute.'
})

export const updateProfileRateLimiter = createRedisRateLimiter({
    keyPrefix: 'update_profile',
    points: 5,
    duration: 10 * 60,
    message: 'Too many profile update attempts. Try again after 10 minutes.'
})

export const updateInfoRateLimiter = createRedisRateLimiter({
    keyPrefix: 'update_info',
    points: 10,
    duration: 10 * 60,
    message: 'Too many info update attempts. Try again after 10 minutes.'
})
