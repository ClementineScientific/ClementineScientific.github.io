import Stripe from 'stripe';
import { db } from './_lib/supabase.js';
import { TIERS, SITE_URL } from './_lib/tiers.js';
import { signToken } from './_lib/token.js';
import { sendEmail, escapeHtml } from './_lib/mailer.js';

// Stripe signature verification needs the unparsed request body.
export const config = { api: { bodyParser: false } };

const APPROVAL_TTL_SECONDS = 14 * 24 * 60 * 60;

async function readRawBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end();
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            await readRawBody(req),
            req.headers['stripe-signature'],
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Stripe signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type !== 'checkout.session.completed') {
        return res.status(200).json({ received: true });
    }

    const session = event.data.object;
    const requestId = session.metadata?.request_id;
    if (!requestId || session.payment_status !== 'paid') {
        return res.status(200).json({ received: true });
    }

    // Retries are safe: status 'paid' is accepted so a failed admin email can be resent.
    const { data: request, error } = await db().from('license_requests')
        .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription
        })
        .eq('id', requestId)
        .in('status', ['pending_payment', 'paid'])
        .select('*')
        .maybeSingle();

    if (error) {
        console.error('Request update failed:', error);
        return res.status(500).json({ error: 'Database error' });
    }
    if (!request) return res.status(200).json({ received: true });

    const token = signToken({ rid: request.id }, process.env.APPROVAL_SECRET, APPROVAL_TTL_SECONDS);
    const approveUrl = `${SITE_URL}/api/approve?token=${encodeURIComponent(token)}`;
    const label = TIERS[request.tier]?.label ?? request.tier;

    try {
        await sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: `FLORAF license awaiting approval: ${label}`,
            text: `${request.name} (${request.email}, ${request.organization}) paid for ${label}.\n\nReview and approve: ${approveUrl}`,
            html: `<p><strong>${escapeHtml(request.name)}</strong> (${escapeHtml(request.email)}, ${escapeHtml(request.organization)}) paid for <strong>${escapeHtml(label)}</strong>.</p>` +
                `<p><a href="${escapeHtml(approveUrl)}">Review and approve</a></p>`
        });
    } catch (err) {
        console.error('Admin email failed:', err);
        return res.status(500).json({ error: 'Email error' });
    }

    return res.status(200).json({ received: true });
}
