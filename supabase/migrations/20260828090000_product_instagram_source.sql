-- ---------------------------------------------------------------------------
-- 0010 — Instagram-sourced products
--
-- Treats are often announced on Instagram first. Recording the source post
-- lets the public card link back to it, and lets the enquiry message name the
-- exact post the customer is asking about — which is the difference between
-- "I want the cookies" and a message the baker can act on immediately.
-- ---------------------------------------------------------------------------

alter table public.products
    add column if not exists instagram_url text;

comment on column public.products.instagram_url is
    'Source Instagram post for this treat, if it was imported from one.';

-- Partial index: only a minority of products come from a post, and this is
-- used to spot duplicates before importing the same URL twice.
create index if not exists idx_products_instagram_url
    on public.products (instagram_url)
    where instagram_url is not null;
