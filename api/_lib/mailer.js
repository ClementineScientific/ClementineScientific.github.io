export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

// Resend HTTP API. Callers must escape any user-supplied text placed in `html`.
export async function sendEmail({ to, subject, html, text }) {
    const { EMAIL_API_KEY, EMAIL_FROM } = process.env;
    if (!EMAIL_API_KEY || !EMAIL_FROM) throw new Error('Email is not configured');

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${EMAIL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html, text })
    });
    if (!res.ok) throw new Error(`Email send failed with status ${res.status}`);
}
