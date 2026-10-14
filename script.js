// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = document.querySelector('.nav').offsetHeight;
            const targetPosition = target.offsetTop - navHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Add shadow to nav on scroll
let lastScroll = 0;
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        nav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        nav.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.05)';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe service cards, tech cards, and FLORAF page cards
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.service-card, .tech-card, .pricing-card, .chart-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
});

// Basic analytics event tracking via GA4
function trackEvent(eventName, eventData = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, eventData);
    }
}

// Track navigation clicks
document.querySelectorAll('.nav-links a, .hero-cta a').forEach(link => {
    link.addEventListener('click', () => {
        trackEvent('navigation_click', {
            link_text: link.textContent,
            link_url: link.href
        });
    });
});

// Track external links (GitHub, LinkedIn)
document.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.addEventListener('click', () => {
        trackEvent('external_link_click', {
            link_text: link.textContent,
            link_url: link.href
        });
    });
});

// Track form interactions
const formInputs = document.querySelectorAll('.subscribe-form input');
formInputs.forEach(input => {
    input.addEventListener('focus', () => {
        trackEvent('form_field_focus', {
            field_name: input.name
        });
    }, { once: true }); // Only track first focus per field
});

// Newsletter signup forms
document.querySelectorAll('.subscribe-form').forEach(subscribeForm => {
    const status = subscribeForm.querySelector('.form-status');
    const button = subscribeForm.querySelector('button[type="submit"]');

    subscribeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.className = 'form-status';
        status.textContent = '';
        button.disabled = true;

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: subscribeForm.elements.email.value,
                    website: subscribeForm.elements.website.value,
                    source: subscribeForm.dataset.source || 'unknown'
                })
            });
            if (!res.ok) throw new Error('subscribe_failed');
            subscribeForm.reset();
            status.classList.add('is-success');
            status.textContent = 'Thanks! You are on the list.';
            trackEvent('newsletter_signup', { source: subscribeForm.dataset.source });
        } catch (err) {
            status.classList.add('is-error');
            status.textContent = 'Something went wrong. Please try again or email rafael@clementinescientific.com.';
        } finally {
            button.disabled = false;
        }
    });
});
