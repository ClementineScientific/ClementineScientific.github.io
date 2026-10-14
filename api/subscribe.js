import { db } from './_lib/supabase.js';
import { normalizeEmail } from './_lib/email-utils.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = req.body ?? {};
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
    }

    // Honeypot: bots fill hidden fields. Pretend success.
    if (body.website) return res.status(200).json({ ok: true });

    const email = normalizeEmail(body.email);
    if (!email) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const source = /^[a-z0-9_-]{1,32}$/.test(String(body.source ?? '')) ? body.source : 'unknown';

    // Duplicates are ignored so the response never reveals whether an email is already on the list.
    const { error } = await db().from('subscribers').upsert({
        email: email.email,
        email_normalized: email.normalized,
        source,
        consented_at: new Date().toISOString()
    }, { onConflict: 'email_normalized', ignoreDuplicates: true });

    if (error) {
        console.error('Subscribe failed:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
    }

    return res.status(200).json({ ok: true });
}
