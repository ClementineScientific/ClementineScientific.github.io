import { createClient } from '@supabase/supabase-js';

let client;

// Service-role client: server-side only, bypasses Row Level Security.
export function db() {
    if (!client) {
        client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false }
        });
    }
    return client;
}
