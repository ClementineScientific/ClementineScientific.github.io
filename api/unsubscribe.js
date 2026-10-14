import { db } from './_lib/supabase.js';
import { escapeHtml } from './_lib/mailer.js';

function page(res, status, title, message) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    return res.status(status).send(
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>` +
        `<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1a1a1a}</style></head>` +
        `<body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/">Back to Clementine Scientific</a></p></body></html>`
    );
}

// GET and POST are both accepted so mail clients can use one-click unsubscribe.
export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).end();
    }

    const token = String(req.query?.token ?? '');
    if (!/^[a-f0-9]{48}$/.test(token)) {
        return page(res, 400, 'Invalid link', 'This unsubscribe link is not valid.');
    }

    const { error } = await db().from('subscribers')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('unsubscribe_token', token)
        .is('unsubscribed_at', null);

    if (error) {
        console.error('Unsubscribe failed:', error);
        return page(res, 500, 'Something went wrong', 'Please try again later or email rafael@clementinescientific.com.');
    }

    return page(res, 200, 'You are unsubscribed', 'You will no longer receive update emails from Clementine Scientific.');
}
