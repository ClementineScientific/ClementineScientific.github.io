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

// Form submission handling
const form = document.querySelector('.contact-form');
if (form) {
    form.addEventListener('submit', function(e) {
        // Formspree will handle the actual submission
        // This just provides user feedback
        const button = form.querySelector('button[type="submit"]');
        const originalText = button.textContent;
        button.textContent = 'Sending...';
        button.disabled = true;
        
        // Note: In production with Formspree, you'll get automatic redirect/feedback
        // This is just for immediate UI feedback
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1000);
    });
}

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

// Observe service cards and tech cards
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.service-card, .tech-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        card.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
});

// Basic analytics event tracking (if you add GA4 or similar)
function trackEvent(eventName, eventData = {}) {
    // Placeholder for analytics tracking
    // If using Google Analytics 4:
    // gtag('event', eventName, eventData);
    
    // If using Plausible:
    // plausible(eventName, { props: eventData });
    
    console.log('Event tracked:', eventName, eventData);
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
const formInputs = document.querySelectorAll('.contact-form input, .contact-form select, .contact-form textarea');
formInputs.forEach(input => {
    input.addEventListener('focus', () => {
        trackEvent('form_field_focus', {
            field_name: input.name
        });
    }, { once: true }); // Only track first focus per field
});
