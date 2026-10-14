-- Run in the Supabase SQL editor. The API uses the service-role key, which bypasses RLS.
-- RLS is enabled with no policies, so the anon and authenticated roles can read nothing.

create extension if not exists pgcrypto;

-- Adding a product later is one insert here; trials, requests, and licenses reference it.
create table products (
    id text primary key,
    name text not null
);
insert into products (id, name) values ('floraf', 'FLORAF');

-- Tier names are validated by the API per product, so tables do not constrain them.
create table trials (
    id uuid primary key default gen_random_uuid(),
    product text not null references products (id),
    email text not null,
    email_normalized text not null,
    name text not null,
    organization text not null,
    created_at timestamptz not null default now(),
    unique (product, email_normalized)
);

create table license_requests (
    id uuid primary key default gen_random_uuid(),
    product text not null references products (id),
    email text not null,
    email_normalized text not null,
    name text not null,
    organization text not null,
    tier text not null,
    use_case text,
    status text not null default 'pending_payment'
        check (status in ('pending_payment', 'paid', 'approved', 'rejected')),
    stripe_session_id text,
    stripe_customer_id text,
    stripe_subscription_id text,
    created_at timestamptz not null default now(),
    paid_at timestamptz,
    approved_at timestamptz
);
create index license_requests_status_idx on license_requests (status);
create index license_requests_session_idx on license_requests (stripe_session_id);

create table licenses (
    id uuid primary key default gen_random_uuid(),
    request_id uuid references license_requests (id),
    product text not null references products (id),
    email text not null,
    tier text not null,
    kind text not null check (kind in ('trial', 'paid')),
    license_key text not null,
    issued_at timestamptz not null default now(),
    expires_at timestamptz
);
create index licenses_email_idx on licenses (email);

create table subscribers (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    email_normalized text not null unique,
    source text not null,
    consented_at timestamptz not null default now(),
    unsubscribed_at timestamptz,
    unsubscribe_token text not null unique default encode(gen_random_bytes(24), 'hex')
);

alter table products enable row level security;
alter table trials enable row level security;
alter table license_requests enable row level security;
alter table licenses enable row level security;
alter table subscribers enable row level security;

-- Tables created via SQL do not get API-role privileges automatically on newer Supabase
-- projects. Only the server-side service_role needs access; anon/authenticated stay locked out.
grant usage on schema public to service_role;
grant select, insert, update, delete on
    products, trials, license_requests, licenses, subscribers
    to service_role;
