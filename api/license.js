import Stripe from 'stripe';
import { db } from './_lib/supabase.js';
import { normalizeEmail, isDisposable } from './_lib/email-utils.js';
import { TIERS, SITE_URL, PRODUCT } from './_lib/tiers.js';
import { generateLicense } from './_lib/generator.js';
import { sendEmail, escapeHtml } from './_lib/mailer.js';

const UNIQUE_VIOLATION = '23505';

function clean(value, max) {
    return String(value ?? '').trim().slice(0, max);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body ?? {});

    // Honeypot: bots fill hidden fields. Pretend success.
    if (body.website) return res.status(200).json({ ok: true });

    const tier = TIERS[body.tier];
    const email = normalizeEmail(body.email);
    const name = clean(body.name, 120);
    const organization = clean(body.organization, 200);

    if (!tier || !email || !name || !organization) {
        return res.status(400).json({ error: 'Please fill in all required fields with valid values.' });
    }
    if (isDisposable(email.domain)) {
        return res.status(400).json({ error: 'Please use a work or institutional email address.' });
    }

    const supabase = db();
    let trial = null;

    // The unique (product, email_normalized) constraint enforces one trial per email per product.
    const { error: claimError } = await supabase.from('trials').insert({
        product: PRODUCT,
        email: email.email,
        email_normalized: email.normalized,
        name,
        organization
    });

    if (!claimError) {
        try {
            const license = await generateLicense({
                product: PRODUCT,
                email: email.email,
                tier: 'trial',
                days: TIERS.trial.days,
                features: TIERS.trial.features
            });
            const { error: recordError } = await supabase.from('licenses').insert({
                product: PRODUCT,
                email: email.email,
                tier: 'trial',
                kind: 'trial',
                license_key: license.key,
                expires_at: license.expiresAt
            });
            if (recordError) throw recordError;
            trial = license;
        } catch (err) {
            console.error('Trial issuance failed:', err);
            // Release the claim so the user can retry.
            await supabase.from('trials').delete().eq('product', PRODUCT).eq('email_normalized', email.normalized);
            return res.status(502).json({ error: 'We could not issue your license right now. Please try again later.' });
        }
    } else if (claimError.code === UNIQUE_VIOLATION) {
        // A prior trial must not block a paid plan.
        if (!tier.paid) return res.status(409).json({ error: 'A trial has already been issued for this email.' });
    } else {
        console.error('Trial claim failed:', claimError);
        return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
    }

    if (body.subscribe === true) {
        const { error } = await supabase.from('subscribers').upsert({
            email: email.email,
            email_normalized: email.normalized,
            source: 'license_form',
            consented_at: new Date().toISOString()
        }, { onConflict: 'email_normalized', ignoreDuplicates: true });
        if (error) console.error('Subscriber upsert failed:', error);
    }

    if (trial) {
        try {
            const expires = trial.expiresAt ? new Date(trial.expiresAt).toUTCString() : 'n/a';
            await sendEmail({
                to: email.email,
                subject: 'Your FLORAF license key',
                text: `Hi ${name},\n\nYour FLORAF license key:\n\n${trial.key}\n\nIt expires ${expires}.\n\nClementine Scientific`,
                html: `<p>Hi ${escapeHtml(name)},</p><p>Your FLORAF license key:</p><p><code>${escapeHtml(trial.key)}</code></p><p>It expires ${escapeHtml(expires)}.</p><p>Clementine Scientific</p>`
            });
        } catch (err) {
            console.error('Trial email failed:', err);
        }
    }

    const result = {
        trialIssued: Boolean(trial),
        trialKey: trial?.key ?? null,
        expiresAt: trial?.expiresAt ?? null
    };

    if (!tier.paid) return res.status(200).json(result);

    try {
        const { data: request, error } = await supabase.from('license_requests').insert({
            product: PRODUCT,
            email: email.email,
            email_normalized: email.normalized,
            name,
            organization,
            tier: body.tier,
            status: 'pending_payment'
        }).select('id').single();
        if (error) throw error;

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: email.email,
            line_items: [{ price: process.env[tier.priceEnv], quantity: 1 }],
            metadata: { request_id: request.id },
            subscription_data: { metadata: { request_id: request.id } },
            success_url: `${SITE_URL}/floraf?checkout=success#license`,
            cancel_url: `${SITE_URL}/floraf?checkout=cancelled#license`
        });

        await supabase.from('license_requests').update({ stripe_session_id: session.id }).eq('id', request.id);

        return res.status(200).json({ ...result, checkoutUrl: session.url });
    } catch (err) {
        console.error('Checkout creation failed:', err);
        return res.status(502).json({ error: 'We could not start checkout. Please try again later.' });
    }
}

function safeParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}
