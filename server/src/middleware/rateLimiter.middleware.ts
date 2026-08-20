import { createHash } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { redis } from "../redis/redis.js";

export const RATE_LIMIT_NAMESPACES = { loginEmail: 'rate-limit:login:email', loginIp: 'rate-limit:login:ip', registration: 'rate-limit:registration', webhook: 'rate-limit:webhook', read: 'rate-limit:read', write: 'rate-limit:write', upload: 'rate-limit:upload', export: 'rate-limit:export', sensitiveAction: 'rate-limit:sensitive-action' } as const;
export const LOGIN_WINDOW_SECONDS = 900;
export const LOGIN_EMAIL_LIMIT = 10;
export const LOGIN_IP_LIMIT = 100;
export const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const hashEmail = (email: string) => createHash('sha256').update(email).digest('hex');
export const requestIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? 'unknown';
export const rateLimitSubject = (req: Request) => req.user?.id != null ? `user:${req.user.id}` : `ip:${requestIp(req)}`;

const loginEmailLimiter = new RateLimiterRedis({ storeClient: redis, useRedisPackage: true, keyPrefix: RATE_LIMIT_NAMESPACES.loginEmail, points: LOGIN_EMAIL_LIMIT, duration: LOGIN_WINDOW_SECONDS });
const loginIpLimiter = new RateLimiterRedis({ storeClient: redis, useRedisPackage: true, keyPrefix: RATE_LIMIT_NAMESPACES.loginIp, points: LOGIN_IP_LIMIT, duration: LOGIN_WINDOW_SECONDS });
type Limiter = Pick<RateLimiterRedis, 'get' | 'consume' | 'delete'>;
const retrySeconds = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

export const sendRateLimited = (res: Response, msBeforeNext: number) => {
    const seconds = retrySeconds(msBeforeNext);
    res.setHeader('Retry-After', String(seconds));
    return res.status(429).json({ message: `Too many attempts. Try again in ${seconds} seconds.` });
};

export async function checkLoginLimit(email: string, ip: string, emailLimiter: Limiter = loginEmailLimiter, ipLimiter: Limiter = loginIpLimiter) {
    const [emailState, ipState] = await Promise.all([emailLimiter.get(hashEmail(email)), ipLimiter.get(ip)]);
    return Math.max(emailState && emailState.remainingPoints <= 0 ? emailState.msBeforeNext : 0, ipState && ipState.remainingPoints <= 0 ? ipState.msBeforeNext : 0);
}

export async function recordLoginFailure(email: string, ip: string, emailLimiter: Limiter = loginEmailLimiter, ipLimiter: Limiter = loginIpLimiter) {
    const results = await Promise.allSettled([emailLimiter.consume(hashEmail(email)), ipLimiter.consume(ip)]);
    const redisError = results.find(result => result.status === 'rejected' && !(result.reason instanceof RateLimiterRes));
    if (redisError?.status === 'rejected') throw redisError.reason;
    const states = results.map(result => result.status === 'fulfilled' ? result.value : result.reason as RateLimiterRes);
    return { attempt: LOGIN_EMAIL_LIMIT - states[0].remainingPoints, waitMs: Math.max(...states.filter(state => state.remainingPoints < 0).map(state => state.msBeforeNext), 0) };
}

export const clearLoginEmailFailures = (email: string, emailLimiter: Limiter = loginEmailLimiter) => emailLimiter.delete(hashEmail(email));
export const progressiveLoginDelayMs = (attempt: number) => attempt < 5 ? 0 : Math.min(2_000, (attempt - 4) * 250);

export const loginPrecheck = async (req: Request, res: Response, next: NextFunction) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) return next();
    try {
        const waitMs = await checkLoginLimit(email, requestIp(req));
        return waitMs > 0 ? sendRateLimited(res, waitMs) : next();
    } catch (error) {
        console.error('Login rate limiter unavailable', error);
        return res.status(503).json({ message: 'Service temporarily unavailable' });
    }
};

type RateLimiterOptions = { keyPrefix: string; points: number; duration: number; message: string };
export function createRedisRateLimiter({ keyPrefix, points, duration, message }: RateLimiterOptions) {
    const limiter = new RateLimiterRedis({ storeClient: redis, useRedisPackage: true, keyPrefix, points, duration });
    return async (req: Request, res: Response, next: NextFunction) => {
        try { await limiter.consume(rateLimitSubject(req)); return next(); }
        catch (error) {
            if (!(error instanceof RateLimiterRes)) { console.error('API rate limiter unavailable', error); return res.status(503).json({ message: 'Service temporarily unavailable' }); }
            res.setHeader('Retry-After', String(retrySeconds(error.msBeforeNext)));
            return res.status(429).json({ message });
        }
    };
}

export const registerRateLimiter = createRedisRateLimiter({ keyPrefix: RATE_LIMIT_NAMESPACES.registration, points: 5, duration: 3600, message: 'Too many registration attempts. Try again later.' });
export const readRateLimiter = createRedisRateLimiter({ keyPrefix: RATE_LIMIT_NAMESPACES.read, points: 1000, duration: 60, message: 'Too many requests. Try again later.' });
export const createRoomLimiter = createRedisRateLimiter({ keyPrefix: `${RATE_LIMIT_NAMESPACES.write}:create-room`, points: 5, duration: 600, message: 'Too many requests. Try again later.' });
export const messageLimiter = createRedisRateLimiter({ keyPrefix: `${RATE_LIMIT_NAMESPACES.write}:message`, points: 500, duration: 60, message: 'Too many requests. Try again later.' });
export const joinRoomRateLimiter = createRedisRateLimiter({ keyPrefix: `${RATE_LIMIT_NAMESPACES.sensitiveAction}:join-room`, points: 10, duration: 900, message: 'Too many attempts. Try again later.' });
export const changePasswordRateLimiter = createRedisRateLimiter({ keyPrefix: `${RATE_LIMIT_NAMESPACES.sensitiveAction}:change-password`, points: 10, duration: 600, message: 'Too many attempts. Try again later.' });
export const createAccountRateLimiter = createRedisRateLimiter({ keyPrefix: `${RATE_LIMIT_NAMESPACES.registration}:admin`, points: 10, duration: 60, message: 'Too many account creation attempts. Try again later.' });
export const updateProfileRateLimiter = createRedisRateLimiter({ keyPrefix: RATE_LIMIT_NAMESPACES.upload, points: 5, duration: 600, message: 'Too many uploads. Try again later.' });
export const updateInfoRateLimiter = createRedisRateLimiter({ keyPrefix: `${RATE_LIMIT_NAMESPACES.write}:profile`, points: 10, duration: 600, message: 'Too many requests. Try again later.' });
