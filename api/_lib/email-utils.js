// Deduplication key: lowercase, strip "+tag" aliases, and drop dots for Gmail.
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com',
    'guerrillamail.com',
    '10minutemail.com',
    'tempmail.com',
    'yopmail.com',
    'trashmail.com',
    'sharklasers.com',
    'getnada.com',
    'dispostable.com',
    'throwawaymail.com'
]);

export function normalizeEmail(raw) {
    const email = String(raw ?? '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

    let [local, domain] = email.split('@');
    local = local.split('+')[0];
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        local = local.replace(/\./g, '');
        domain = 'gmail.com';
    }
    if (!local) return null;

    return { email, normalized: `${local}@${domain}`, domain };
}

export function isDisposable(domain) {
    return DISPOSABLE_DOMAINS.has(domain);
}
