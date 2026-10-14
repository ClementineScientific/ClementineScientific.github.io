import { randomBytes } from 'node:crypto';

/**
 * Contract with the license generator.
 *
 * Request:  POST LICENSE_GENERATOR_URL
 *           Authorization: Bearer LICENSE_GENERATOR_TOKEN
 *           { "product": string, "email": string, "tier": "trial" | "academic" | "commercial",
 *             "days": number | null, "features": string[] }
 * Response: { "key": string, "expiresAt": string | null }  (ISO 8601)
 *
 * Throws on any failure.
 */
export async function generateLicense({ product, email, tier, days, features }) {
    // Local development only; never active in a production deployment.
    if (process.env.LICENSE_GENERATOR_MOCK === '1' && process.env.VERCEL_ENV !== 'production') {
        const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
        return { key: `MOCK-${randomBytes(8).toString('hex').toUpperCase()}`, expiresAt };
    }

    const { LICENSE_GENERATOR_URL, LICENSE_GENERATOR_TOKEN } = process.env;
    if (!LICENSE_GENERATOR_URL || !LICENSE_GENERATOR_TOKEN) {
        throw new Error('License generator is not configured');
    }

    const res = await fetch(LICENSE_GENERATOR_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${LICENSE_GENERATOR_TOKEN}`
        },
        body: JSON.stringify({ product, email, tier, days, features })
    });
    if (!res.ok) throw new Error(`License generator responded ${res.status}`);

    const data = await res.json();
    if (typeof data.key !== 'string' || !data.key) throw new Error('License generator returned no key');
    return { key: data.key, expiresAt: data.expiresAt ?? null };
}
