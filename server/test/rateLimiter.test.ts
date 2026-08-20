import assert from 'node:assert/strict';
import test from 'node:test';
import { checkLoginLimit, clearLoginEmailFailures, hashEmail, LOGIN_EMAIL_LIMIT, progressiveLoginDelayMs, rateLimitSubject, recordLoginFailure, sendRateLimited } from '../src/middleware/rateLimiter.middleware.js';

class FakeLimiter {
    states = new Map<string, { remainingPoints: number; msBeforeNext: number }>();
    constructor(private points: number) {}
    async get(key: string) { return this.states.get(key) ?? null; }
    async consume(key: string) {
        const old = this.states.get(key) ?? { remainingPoints: this.points, msBeforeNext: 900_000 };
        const state = { ...old, remainingPoints: old.remainingPoints - 1 };
        this.states.set(key, state);
        return state;
    }
    async delete(key: string) { return this.states.delete(key); }
}

test('email keys are hashes and successful login clears only the email counter', async () => {
    const email = new FakeLimiter(10), ip = new FakeLimiter(100);
    await recordLoginFailure('user@example.com', '203.0.113.1', email as never, ip as never);
    assert(email.states.has(hashEmail('user@example.com')));
    assert(![...email.states.keys()][0].includes('user@example.com'));
    await clearLoginEmailFailures('user@example.com', email as never);
    assert.equal(email.states.size, 0);
    assert.equal(ip.states.size, 1);
});

test('shared IPs retain different email buckets', async () => {
    const email = new FakeLimiter(10), ip = new FakeLimiter(100);
    await recordLoginFailure('a@example.com', '203.0.113.2', email as never, ip as never);
    await recordLoginFailure('b@example.com', '203.0.113.2', email as never, ip as never);
    assert.equal(email.states.size, 2);
    assert.equal(ip.states.size, 1);
});

test('changing IPs does not evade an email limit', async () => {
    const email = new FakeLimiter(LOGIN_EMAIL_LIMIT), ip = new FakeLimiter(100);
    for (let n = 0; n < LOGIN_EMAIL_LIMIT; n++) await recordLoginFailure('a@example.com', `203.0.113.${n}`, email as never, ip as never);
    assert.equal(await checkLoginLimit('a@example.com', '198.51.100.1', email as never, ip as never), 900_000);
});

test('different authenticated users and changing user IPs have correct subjects', () => {
    const req = (user: unknown, ip: string) => ({ user, ip, socket: {} }) as never;
    assert.equal(rateLimitSubject(req({ id: 42 }, '203.0.113.1')), 'user:42');
    assert.equal(rateLimitSubject(req({ id: 42 }, '198.51.100.9')), 'user:42');
    assert.equal(rateLimitSubject(req({ id: 43 }, '203.0.113.1')), 'user:43');
    assert.equal(rateLimitSubject(req(undefined, '203.0.113.1')), 'ip:203.0.113.1');
});

test('delay starts at fifth failure and caps at two seconds', () => {
    assert.equal(progressiveLoginDelayMs(4), 0);
    assert.equal(progressiveLoginDelayMs(5), 250);
    assert.equal(progressiveLoginDelayMs(20), 2000);
});

test('429 body and Retry-After contain the same actual rounded wait', () => {
    const headers = new Map<string, string>(); let status = 0; let body: unknown;
    const res = { setHeader: (key: string, value: string) => headers.set(key, value), status: (value: number) => { status = value; return res; }, json: (value: unknown) => { body = value; return res; } } as never;
    sendRateLimited(res, 1501);
    assert.equal(status, 429); assert.equal(headers.get('Retry-After'), '2'); assert.deepEqual(body, { message: 'Too many attempts. Try again in 2 seconds.' });
});

test('Redis errors propagate for fail-closed handling', async () => {
    const broken = { get: async () => { throw new Error('redis down'); } };
    await assert.rejects(checkLoginLimit('a@example.com', '203.0.113.1', broken as never, broken as never), /redis down/);
});
