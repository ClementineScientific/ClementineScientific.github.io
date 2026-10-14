import { db } from './_lib/supabase.js';
import { TIERS } from './_lib/tiers.js';
import { verifyToken } from './_lib/token.js';
import { generateLicense } from './_lib/generator.js';
import { sendEmail, escapeHtml } from './_lib/mailer.js';

function page(res, status, title, bodyHtml) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'");
    return res.status(status).send(
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>` +
        `<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem;color:#1a1a1a}button{padding:.75rem 1.5rem;font-size:1rem}code{word-break:break-all}</style></head>` +
        `<body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>`
    );
}

// GET shows a confirmation page; only POST changes state, so link scanners cannot approve.
export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).end();
    }

    const token = req.method === 'GET' ? req.query?.token : req.body?.token;
    const payload = verifyToken(token, process.env.APPROVAL_SECRET);
    if (!payload || typeof payload.rid !== 'string') {
        return page(res, 400, 'Invalid or expired link', '<p>This approval link is not valid.</p>');
    }

    const supabase = db();

    if (req.method === 'GET') {
        const { data: request } = await supabase.from('license_requests')
            .select('*').eq('id', payload.rid).maybeSingle();

        if (!request) return page(res, 404, 'Not found', '<p>No matching request.</p>');
        if (request.status !== 'paid') {
            return page(res, 200, 'Nothing to approve', `<p>This request is <strong>${escapeHtml(request.status)}</strong>.</p>`);
        }

        return page(res, 200, 'Approve license', 
            `<p><strong>${escapeHtml(request.name)}</strong><br>${escapeHtml(request.email)}<br>${escapeHtml(request.organization)}</p>` +
            `<p>Plan: ${escapeHtml(TIERS[request.tier]?.label ?? request.tier)}</p>` +
            `<form method="POST" action="/api/approve"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">Approve and issue license</button></form>`
        );
    }

    // Atomic claim: only one concurrent approval can move 'paid' to 'approved'.
    const { data: request, error: claimError } = await supabase.from('license_requests')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', payload.rid)
        .eq('status', 'paid')
        .select('*')
        .maybeSingle();

    if (claimError) {
        console.error('Approval claim failed:', claimError);
        return page(res, 500, 'Error', '<p>Database error. Try again.</p>');
    }
    if (!request) {
        return page(res, 200, 'Already processed', '<p>This request was already approved or is not paid.</p>');
    }

    const tier = TIERS[request.tier];
    let license;
    try {
        license = await generateLicense({
            product: request.product,
            email: request.email,
            tier: request.tier,
            days: tier.days,
            features: tier.features
        });
        const { error } = await supabase.from('licenses').insert({
            request_id: request.id,
            product: request.product,
            email: request.email,
            tier: request.tier,
            kind: 'paid',
            license_key: license.key,
            expires_at: license.expiresAt
        });
        if (error) throw error;
    } catch (err) {
        console.error('License issuance failed:', err);
        await supabase.from('license_requests').update({ status: 'paid', approved_at: null }).eq('id', request.id);
        return page(res, 502, 'License generation failed', '<p>The request is still pending. Try the link again.</p>');
    }

    try {
        await sendEmail({
            to: request.email,
            subject: `Your FLORAF ${tier.label} license`,
            text: `Hi ${request.name},\n\nYour FLORAF ${tier.label} license key:\n\n${license.key}\n\nClementine Scientific`,
            html: `<p>Hi ${escapeHtml(request.name)},</p><p>Your FLORAF ${escapeHtml(tier.label)} license key:</p><p><code>${escapeHtml(license.key)}</code></p><p>Clementine Scientific</p>`
        });
    } catch (err) {
        console.error('License email failed:', err);
        return page(res, 200, 'Approved, email failed',
            `<p>Send this key to ${escapeHtml(request.email)} manually:</p><p><code>${escapeHtml(license.key)}</code></p>`);
    }

    return page(res, 200, 'Approved', `<p>License emailed to ${escapeHtml(request.email)}.</p>`);
}
