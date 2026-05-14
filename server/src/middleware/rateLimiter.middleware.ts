import rateLimit from "express-rate-limit";

// for login attempt
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 15, // 15 max attempts
    message: { message: 'Too many login attempts. Please try again after 15 minutes'} ,
    standardHeaders: true,
    legacyHeaders: true
})

export const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 max attempts
    message: {
        message: 'Too many registration attempts. Try again later.'
    },
    standardHeaders: true,
    legacyHeaders: true
})

export const createRoomLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 5, // 5 max attempts
    message: { message: 'Too many request. Try again after 10 minutes.' },
    standardHeaders: true,
    legacyHeaders: true
})

export const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 max attemps
    message: { message: "You're sending messages too quickly. Please slow down." },
    standardHeaders: true,
    legacyHeaders: true
})

export const joinRoomRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        message: 'Too many attempts to join room. Try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: true
})

export const changePasswordRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: {
        message: 'Too many attempts to join room. Try again after 10 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: true
})

export const createAccountRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        message: 'Too many attempts to join room. Try again after 1 minute.'
    },
    standardHeaders: true,
    legacyHeaders: true
})

export const updateProfileRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: {
        message: 'Too many attempts to join room. Try again after 10 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: true
})

export const updateInfoRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: {
        message: 'Too many attempts to join room. Try again after 10 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: true
})