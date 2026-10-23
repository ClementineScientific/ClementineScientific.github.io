// FLORAF page: charts and license request form.

// ---------------------------------------------------------------------------
// Chart data. PLACEHOLDER values: replace with measured benchmark results.
// ---------------------------------------------------------------------------
const RUNTIME_DATA = {
    turbines: [10, 25, 50, 100, 250, 500, 1000],
    floris: [0.4, 2, 8, 30, 190, 780, 3100],
    floraf: [0.1, 0.12, 0.2, 0.5, 1.8, 5.5, 20]
};

function convergence(max, tau, tMax, steps = 40) {
    return Array.from({ length: steps + 1 }, (_, i) => {
        const t = (tMax * i) / steps;
        return [t, max * (1 - Math.exp(-t / tau))];
    });
}

const LAYOUT_DATA = {
    floris: convergence(4.0, 25, 60),
    floraf: convergence(4.0, 3, 60)
};

const YAW_DATA = {
    floris: convergence(2.5, 15, 30),
    floraf: convergence(2.5, 1.5, 30)
};

// ---------------------------------------------------------------------------
// Minimal SVG line chart (no dependencies)
// ---------------------------------------------------------------------------
const SVG_W = 560;
const SVG_H = 340;
const MARGIN = { l: 60, r: 16, t: 12, b: 48 };

function makeScale(type, [d0, d1], [r0, r1]) {
    if (type === 'log') {
        const a = Math.log10(d0);
        const b = Math.log10(d1);
        return v => r0 + ((Math.log10(v) - a) / (b - a)) * (r1 - r0);
    }
    return v => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

function formatTick(v) {
    return v >= 1000 ? `${v / 1000}k` : String(v);
}

// All inputs come from the constants above, never from user input.
function renderChart(el, { x, y, series }) {
    const sx = makeScale(x.type, x.domain, [MARGIN.l, SVG_W - MARGIN.r]);
    const sy = makeScale(y.type, y.domain, [SVG_H - MARGIN.b, MARGIN.t]);
    const bottom = SVG_H - MARGIN.b;

    const xTicks = x.ticks.map(v =>
        `<line class="tick" x1="${sx(v)}" x2="${sx(v)}" y1="${MARGIN.t}" y2="${bottom}"/>` +
        `<text class="tick-label" x="${sx(v)}" y="${bottom + 16}" text-anchor="middle">${formatTick(v)}</text>`
    ).join('');

    const yTicks = y.ticks.map(v =>
        `<line class="tick" x1="${MARGIN.l}" x2="${SVG_W - MARGIN.r}" y1="${sy(v)}" y2="${sy(v)}"/>` +
        `<text class="tick-label" x="${MARGIN.l - 8}" y="${sy(v) + 4}" text-anchor="end">${formatTick(v)}</text>`
    ).join('');

    const paths = series.map(s => {
        const d = s.points
            .map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${sx(px).toFixed(1)} ${sy(py).toFixed(1)}`)
            .join(' ');
        return `<path class="series ${s.cls}" pathLength="1" d="${d}"/>`;
    }).join('');

    el.innerHTML =
        `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" aria-hidden="true" focusable="false">` +
        xTicks + yTicks +
        `<line class="axis" x1="${MARGIN.l}" x2="${SVG_W - MARGIN.r}" y1="${bottom}" y2="${bottom}"/>` +
        `<line class="axis" x1="${MARGIN.l}" x2="${MARGIN.l}" y1="${MARGIN.t}" y2="${bottom}"/>` +
        paths +
        `<text class="axis-label" x="${(MARGIN.l + SVG_W - MARGIN.r) / 2}" y="${SVG_H - 8}" text-anchor="middle">${x.label}</text>` +
        `<text class="axis-label" transform="translate(14 ${(MARGIN.t + bottom) / 2}) rotate(-90)" text-anchor="middle">${y.label}</text>` +
        `</svg>`;
}

const runtimeEl = document.getElementById('runtime-chart');
if (runtimeEl) {
    renderChart(runtimeEl, {
        x: { type: 'log', domain: [10, 1000], ticks: [10, 100, 1000], label: 'Number of turbines' },
        y: { type: 'log', domain: [0.1, 10000], ticks: [0.1, 1, 10, 100, 1000, 10000], label: 'Runtime (s)' },
        series: [
            { cls: 'series-floris', points: RUNTIME_DATA.turbines.map((n, i) => [n, RUNTIME_DATA.floris[i]]) },
            { cls: 'series-floraf', points: RUNTIME_DATA.turbines.map((n, i) => [n, RUNTIME_DATA.floraf[i]]) }
        ]
    });
}

const layoutEl = document.getElementById('layout-chart');
if (layoutEl) {
    renderChart(layoutEl, {
        x: { type: 'linear', domain: [0, 60], ticks: [0, 15, 30, 45, 60], label: 'Wall-clock time (min)' },
        y: { type: 'linear', domain: [0, 5], ticks: [0, 1, 2, 3, 4, 5], label: 'AEP gain (%)' },
        series: [
            { cls: 'series-floris', points: LAYOUT_DATA.floris },
            { cls: 'series-floraf', points: LAYOUT_DATA.floraf }
        ]
    });
}

const yawEl = document.getElementById('yaw-chart');
if (yawEl) {
    renderChart(yawEl, {
        x: { type: 'linear', domain: [0, 30], ticks: [0, 10, 20, 30], label: 'Wall-clock time (min)' },
        y: { type: 'linear', domain: [0, 3], ticks: [0, 1, 2, 3], label: 'AEP gain (%)' },
        series: [
            { cls: 'series-floris', points: YAW_DATA.floris },
            { cls: 'series-floraf', points: YAW_DATA.floraf }
        ]
    });
}

// Draw the lines when a chart scrolls into view
const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            chartObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });
document.querySelectorAll('.chart').forEach(chart => chartObserver.observe(chart));

// ---------------------------------------------------------------------------
// CTAs
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-cta]').forEach(link => {
    link.addEventListener('click', () => {
        trackEvent('floraf_cta_click', { cta: link.dataset.cta });
    });
});

const licenseForm = document.getElementById('license-form');
const licenseResult = document.getElementById('license-result');

// ---------------------------------------------------------------------------
// License request form
// ---------------------------------------------------------------------------
function showResult(title, lines, key) {
    licenseResult.replaceChildren();
    const box = document.createElement('div');
    box.className = 'result-box';

    const heading = document.createElement('h3');
    heading.textContent = title;
    box.appendChild(heading);

    if (key) {
        const code = document.createElement('code');
        code.className = 'license-key';
        code.textContent = key;
        box.appendChild(code);

        if (navigator.clipboard) {
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'btn btn-secondary';
            copy.textContent = 'Copy key';
            copy.addEventListener('click', async () => {
                await navigator.clipboard.writeText(key);
                copy.textContent = 'Copied';
            });
            box.appendChild(copy);
        }
    }

    lines.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        box.appendChild(p);
    });

    licenseResult.appendChild(box);
    licenseResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

if (licenseForm) {
    const status = licenseForm.querySelector('.form-status');
    const button = licenseForm.querySelector('button[type="submit"]');

    licenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.className = 'form-status';
        status.textContent = '';
        licenseResult.replaceChildren();
        button.disabled = true;

        const f = licenseForm.elements;
        const tier = f.tier.value;

        try {
            const res = await fetch('/api/license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: f.name.value,
                    email: f.email.value,
                    organization: f.organization.value,
                    tier,
                    subscribe: f.subscribe.checked,
                    website: f.website.value
                })
            });

            let data = {};
            try { data = await res.json(); } catch (err) { /* non-JSON error body */ }

            if (res.status === 409) {
                status.classList.add('is-error');
                status.textContent = 'A free license has already been issued for this email. Contact rafael@clementinescientific.com if you need help.';
                return;
            }
            if (!res.ok) {
                status.classList.add('is-error');
                status.textContent = data.error || 'Something went wrong. Please try again or email rafael@clementinescientific.com.';
                return;
            }

            trackEvent('license_request', { tier });

            // Only follow checkout redirects to Stripe.
            if (data.checkoutUrl && data.checkoutUrl.startsWith('https://checkout.stripe.com/')) {
                status.classList.add('is-success');
                status.textContent = (data.trialIssued ? 'Your free license key is on its way by email. ' : '') + 'Redirecting to secure checkout…';
                window.location.assign(data.checkoutUrl);
                return;
            }

            licenseForm.reset();
            showResult('Your FLORAF license key', [
                `Valid until ${new Date(data.expiresAt).toLocaleDateString()}. We also emailed it to you.`
            ], data.trialKey);
        } catch (err) {
            status.classList.add('is-error');
            status.textContent = 'Network error. Please try again.';
        } finally {
            button.disabled = false;
        }
    });
}

// Return from Stripe Checkout
const checkoutState = new URLSearchParams(window.location.search).get('checkout');
if (licenseResult && checkoutState === 'success') {
    showResult('Payment received', [
        'Thank you. Your full license will be issued after a quick review, and your current license remains valid in the meantime.'
    ]);
} else if (licenseForm && checkoutState === 'cancelled') {
    const status = licenseForm.querySelector('.form-status');
    status.className = 'form-status is-error';
    status.textContent = 'Checkout was cancelled. You can try again below.';
}
