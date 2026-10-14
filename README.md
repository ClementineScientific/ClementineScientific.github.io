# Clementine Scientific Website

Professional website for Clementine Scientific - Wind Energy Modeling & Software Solutions

## 🚀 Quick Start

This is a static website with Vercel serverless functions (`api/`), hosted on Vercel with a custom domain.

### Local Development

1. Simply open `index.html` in your browser, or
2. Use a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```
3. Visit `http://localhost:8000`

## 📝 Setup Instructions

### 1. Contact Form Setup (Formspree)

**Update:** This is removed in favor of collecting emails into a database. Leaving here for future reference.

The contact form needs to be connected to Formspree:

1. Go to [formspree.io](https://formspree.io) and create a free account
2. Create a new form and get your form ID
3. In `index.html`, replace `YOUR_FORM_ID` on line 183 with your actual Formspree form ID:
   ```html
   <form class="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

### 2. Analytics Setup

Choose one of these options:

#### Option A: Google Analytics 4 (Most comprehensive)
1. Create a GA4 property at [analytics.google.com](https://analytics.google.com)
2. Get your Measurement ID (format: G-XXXXXXXXXX)
3. Add this code to `index.html` before the closing `</head>` tag:
   ```html
   <!-- Google tag (gtag.js) -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```
4. Update `script.js` line 60 to uncomment the GA4 tracking:
   ```javascript
   gtag('event', eventName, eventData);
   ```

#### Option B: Plausible Analytics (Privacy-friendly, simpler)
1. Sign up at [plausible.io](https://plausible.io)
2. Add your domain
3. Add this code to `index.html` before the closing `</head>` tag:
   ```html
   <script defer data-domain="clementinescientific.com" src="https://plausible.io/js/script.js"></script>
   ```
4. Update `script.js` line 63 to uncomment the Plausible tracking:
   ```javascript
   plausible(eventName, { props: eventData });
   ```

#### Option C: Simple Analytics
1. Sign up at [simpleanalytics.com](https://simpleanalytics.com)
2. Add this code to `index.html` before the closing `</head>` tag:
   ```html
   <script async defer src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
   <noscript><img src="https://queue.simpleanalyticscdn.com/noscript.gif" alt="" referrerpolicy="no-referrer-when-downgrade" /></noscript>
   ```

### 3. Custom Domain Configuration (Vercel)

1. Import this repo into Vercel and add `clementinescientific.com` under Project Settings → Domains.
2. Update DNS at your registrar to the records Vercel shows (remove the old GitHub Pages A/CNAME records).
3. Delete the `CNAME` file once the domain points at Vercel, and disable GitHub Pages in the repo settings.

### 4. FLORAF licensing backend

The `/floraf` page posts to serverless functions in `api/`:

| Function | Purpose |
| --- | --- |
| `api/license.js` | Issues a one-per-email 7-day trial key; starts Stripe Checkout for paid tiers |
| `api/stripe-webhook.js` | Marks paid requests and emails you an approval link |
| `api/approve.js` | Confirmation page; POST issues the full license and emails it |
| `api/subscribe.js` / `api/unsubscribe.js` | Mailing list |

Setup:

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. In Stripe, create two monthly prices (Academic $150, Commercial $500) and a webhook to `https://clementinescientific.com/api/stripe-webhook` for `checkout.session.completed`.
3. Set these Vercel environment variables (never commit them):

   | Variable | Notes |
   | --- | --- |
   | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Service-role key, server-side only |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | |
   | `STRIPE_PRICE_ACADEMIC`, `STRIPE_PRICE_COMMERCIAL` | Stripe price IDs |
   | `APPROVAL_SECRET` | Long random string used to sign approval links |
   | `LICENSE_GENERATOR_URL`, `LICENSE_GENERATOR_TOKEN` | See contract in `api/_lib/generator.js` |
   | `EMAIL_API_KEY`, `EMAIL_FROM` | Resend |
   | `ADMIN_EMAIL` | Receives approval requests |
   | `SITE_URL` | Optional, defaults to `https://clementinescientific.com` |

4. Add a Vercel Firewall rate-limit rule for `/api/*`.
5. Local testing: `npx vercel dev`. Set `LICENSE_GENERATOR_MOCK=1` to use a fake generator outside production.

Benchmark values on `/floraf` and the homepage card are placeholders: see `RUNTIME_DATA`, `convergence(...)` in `floraf.js` and the `PLACEHOLDER` comments in the HTML.

## 🎨 Customization Guide

### Colors
Edit CSS variables in `styles.css` (lines 8-20):
```css
:root {
    --primary-color: #2c5f6f;    /* Main brand color */
    --primary-dark: #1e4350;     /* Darker shade for hovers */
    --accent-color: #2c5f6f;     /* Accent color */
    /* ... */
}
```

### Content
- **Hero message**: Edit `index.html` lines 38-40
- **Services**: Lines 54-121
- **Technologies**: Lines 133-151
- **About section**: Lines 163-173
- **Contact info**: Lines 213-233

### Adding a Logo
1. Add your logo image to the repo (e.g., `logo.png`)
2. Replace line 25 in `index.html`:
   ```html
   <a href="#home" class="logo">
       <img src="logo.png" alt="Clementine Scientific" height="32">
   </a>
   ```
3. Adjust styling in `styles.css` around line 165

## 🔄 Deployment

Push to `main`; Vercel builds and deploys automatically.

```bash
git add .
git commit -m "Update website content"
git push origin main
```

## 📱 Testing

- **Responsiveness**: Test on mobile devices or use browser dev tools
- **Forms**: Submit a test form to verify Formspree is working
- **Analytics**: Check your analytics dashboard after a few hours
- **Links**: Verify all external links work (GitHub, LinkedIn, NREL software)

## 🛠️ File Structure

```
clementinescientific.github.io/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── script.js           # JavaScript functionality
├── CNAME              # Custom domain configuration
├── README.md          # This file
└── considerations.txt # Planning document
```

## 📈 Future Enhancements

Planned additions documented in `considerations.txt`:
- Blog section
- Resource downloads (cheat sheets, Jupyter notebooks)
- Multi-language support
- Newsletter signup
- Case studies/portfolio items

## 🐛 Troubleshooting

**Site not loading on custom domain?**
- Check DNS settings in your domain registrar
- Verify CNAME file contains only `clementinescientific.com`
- Wait up to 48 hours for DNS propagation

**Contact form not working?**
- Verify Formspree form ID is correct in `index.html`
- Check Formspree dashboard for submissions

**Analytics not tracking?**
- Verify analytics script is in the `<head>` section
- Check browser console for errors
- Analytics may take 24-48 hours to show data

## 📞 Support

For questions about the website setup, contact rafael@clementinescientific.com

---

Built with ❤️ for the wind energy community
