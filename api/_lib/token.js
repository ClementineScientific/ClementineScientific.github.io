import { createHmac, timingSafeEqual } from 'node:crypto';

function sign(body, secret) {
    return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signToken(data, secret, ttlSeconds) {
    const body = Buffer.from(
        JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
    ).toString('base64url');
    return `${body}.${sign(body, secret)}`;
}

// Returns the payload, or null if the token is malformed, tampered with, or expired.
export function verifyToken(token, secret) {
    if (typeof token !== 'string' || !secret) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [body, sig] = parts;
    const expected = Buffer.from(sign(body, secret));
    const actual = Buffer.from(sig);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
    } catch {
        return null;
    }
}
