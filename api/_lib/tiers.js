// Tiers below belong to this product; a second product would get its own tier table.
export const PRODUCT = 'floraf';

// Feature names are the contract with the license generator; adjust to match it.
export const TIERS = {
    trial: { label: 'Free trial', days: 14, features: ['limited'], paid: false },
    academic: { label: 'Academic', days: null, features: ['limited'], paid: true, priceEnv: 'STRIPE_PRICE_ACADEMIC' },
    commercial: { label: 'Commercial', days: null, features: ['full'], paid: true, priceEnv: 'STRIPE_PRICE_COMMERCIAL' }
};

export const SITE_URL = process.env.SITE_URL || 'https://clementinescientific.com';
