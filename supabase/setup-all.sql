-- ============================================================================
-- Magic T-treats — complete database setup
--
-- Generated from supabase/migrations/*.sql in order, then seed.sql.
-- Paste the whole file into the Supabase SQL Editor and run it once.
-- Safe to re-run: every statement is idempotent or upsert-shaped.
--
-- Storage is applied LAST and is failure-tolerant, so a restricted
-- permission there cannot stop the schema or seed data from loading.
-- ============================================================================


-- >>>>>>>>>>>>>>>>>>>> 20260827090000_extensions_and_helpers.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0001 — Extensions and shared helper functions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Reusable updated_at trigger function, applied to every mutable table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

comment on function public.set_updated_at is
    'Trigger function that stamps updated_at on every UPDATE.';

-- Slug helper. Used by seeds and by admin code paths that want a server-side
-- fallback slug. Lowercase, alphanumeric, single hyphens, trimmed.
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
    select trim(
        both '-' from
        regexp_replace(
            regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'),
            '-{2,}', '-', 'g'
        )
    );
$$;

comment on function public.slugify is
    'Converts arbitrary text into a URL-safe slug.';

-- >>>>>>>>>>>>>>>>>>>> 20260827090100_admin_users.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0002 — Admin users and the is_admin() authorisation helper
--
-- Authentication is handled entirely by Supabase Auth (auth.users). This table
-- is the authorisation layer: a row here is what grants dashboard access.
-- Creating an auth user alone does NOT grant admin rights.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    role text not null default 'owner' check (role in ('owner', 'admin', 'staff')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.admin_users is
    'Authorisation roster for the admin dashboard. Presence of an active row grants access.';

drop trigger if exists set_admin_users_updated_at on public.admin_users;
create trigger set_admin_users_updated_at
    before update on public.admin_users
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- is_admin() is the single source of truth for every admin RLS policy.
--
-- SECURITY DEFINER is required: without it the policy on admin_users would
-- recurse while trying to read admin_users. search_path is pinned to defeat
-- search-path hijacking.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.admin_users
        where user_id = auth.uid()
          and is_active
    );
$$;

comment on function public.is_admin is
    'True when the current JWT belongs to an active admin. Used by every admin RLS policy.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Role lookup, for future staff/content-manager scoping. V1 treats every
-- active admin as full access, but policies can tighten against this later.
create or replace function public.admin_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
    select role
    from public.admin_users
    where user_id = auth.uid()
      and is_active;
$$;

revoke all on function public.admin_role() from public;
grant execute on function public.admin_role() to authenticated;

-- >>>>>>>>>>>>>>>>>>>> 20260827090200_catalog.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0003 — Product catalogue: categories, products, media, festive collections
-- ---------------------------------------------------------------------------

do $$
begin
    if not exists (select 1 from pg_type where typname = 'media_type') then
        create type media_type as enum ('image', 'video');
    end if;
end
$$;

-- --- Categories ------------------------------------------------------------
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    description text,
    image_url text,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.categories is 'Top-level product groupings shown on the public site.';

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
    before update on public.categories
    for each row execute function public.set_updated_at();

-- --- Products --------------------------------------------------------------
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    sku text unique not null,
    category_id uuid references public.categories(id) on delete set null,
    name text not null,
    slug text unique not null,
    short_description text,
    description text,
    starting_price numeric(10, 2) check (starting_price is null or starting_price >= 0),
    price_label text,
    -- Free-form marketing tags that do not deserve a boolean column of their
    -- own, e.g. 'Limited Batch', 'Handmade'. Kept admin-editable.
    highlight_tags text[] not null default '{}',
    is_sugar_free boolean not null default false,
    is_eggless boolean not null default false,
    is_customizable boolean not null default false,
    is_bestseller boolean not null default false,
    is_seasonal boolean not null default false,
    available_today boolean not null default false,
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.products is 'Bakery catalogue. Products are archived via is_active, never hard-deleted.';
comment on column public.products.highlight_tags is 'Extra display-only badges, e.g. Limited Batch / Handmade.';

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();

create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_active on public.products (is_active);
create index if not exists idx_products_bestseller on public.products (is_bestseller);
create index if not exists idx_products_available_today on public.products (available_today);
create index if not exists idx_products_seasonal on public.products (is_seasonal);
create index if not exists idx_products_sort on public.products (sort_order, name);

-- --- Product media ---------------------------------------------------------
create table if not exists public.product_media (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references public.products(id) on delete cascade,
    type media_type not null,
    storage_path text not null,
    media_url text,
    thumbnail_url text,
    alt_text text,
    is_primary boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

comment on table public.product_media is 'Images and videos attached to a product. Binary data lives in Supabase Storage.';

create index if not exists idx_product_media_product on public.product_media (product_id, sort_order);

-- At most one primary asset per product, enforced by the database rather than
-- by application code.
create unique index if not exists uniq_product_media_primary
    on public.product_media (product_id)
    where is_primary;

-- --- Festive collections ---------------------------------------------------
create table if not exists public.collections (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    description text,
    cover_image text,
    available_from date,
    available_until date,
    featured boolean not null default false,
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint collections_date_range_valid
        check (available_from is null or available_until is null or available_until >= available_from)
);

comment on table public.collections is 'Seasonal / occasion-based curated product sets.';

drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at
    before update on public.collections
    for each row execute function public.set_updated_at();

create index if not exists idx_collections_active on public.collections (active, sort_order);

create table if not exists public.collection_products (
    collection_id uuid not null references public.collections(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    sort_order integer not null default 0,
    primary key (collection_id, product_id)
);

create index if not exists idx_collection_products_product on public.collection_products (product_id);

-- >>>>>>>>>>>>>>>>>>>> 20260827090300_leads_and_orders.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0004 — Lead capture and order lifecycle
-- ---------------------------------------------------------------------------

do $$
begin
    if not exists (select 1 from pg_type where typname = 'enquiry_status') then
        create type enquiry_status as enum ('new', 'contacted', 'converted', 'closed', 'spam');
    end if;
    if not exists (select 1 from pg_type where typname = 'order_status') then
        create type order_status as enum (
            'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
        );
    end if;
end
$$;

-- --- Enquiries -------------------------------------------------------------
create table if not exists public.enquiries (
    id uuid primary key default gen_random_uuid(),
    product_id uuid references public.products(id) on delete set null,
    -- SKU and name are denormalised on purpose: an enquiry is a historical
    -- record and must stay readable even if the product is later renamed.
    product_sku text,
    product_name text,
    customer_name text,
    phone text,
    email text,
    quantity text,
    required_date date,
    fulfilment_type text check (fulfilment_type in ('delivery', 'pickup')),
    customization text,
    message text,
    source text not null default 'website',
    status enquiry_status not null default 'new',
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    referrer text,
    device_type text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.enquiries is
    'Customer enquiries captured from the website before the Instagram/WhatsApp handoff. Private.';

drop trigger if exists set_enquiries_updated_at on public.enquiries;
create trigger set_enquiries_updated_at
    before update on public.enquiries
    for each row execute function public.set_updated_at();

create index if not exists idx_enquiries_status on public.enquiries (status);
create index if not exists idx_enquiries_created_at on public.enquiries (created_at desc);
create index if not exists idx_enquiries_product on public.enquiries (product_id);
create index if not exists idx_enquiries_utm_source on public.enquiries (utm_source);

-- --- Enquiry analytics events ----------------------------------------------
-- Intent signals (button clicks, product views) tracked separately from
-- submitted enquiries so the funnel has a top.
create table if not exists public.enquiry_events (
    id uuid primary key default gen_random_uuid(),
    product_id uuid references public.products(id) on delete set null,
    product_sku text,
    event_type text not null,
    source text,
    cta_location text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    referrer text,
    device_type text,
    created_at timestamptz not null default now()
);

create index if not exists idx_enquiry_events_type_created
    on public.enquiry_events (event_type, created_at desc);
create index if not exists idx_enquiry_events_product on public.enquiry_events (product_id);
create index if not exists idx_enquiry_events_created_at on public.enquiry_events (created_at desc);

-- --- Orders ----------------------------------------------------------------
create sequence if not exists public.order_number_seq;

-- Human-friendly, sortable, collision-free order numbers: MT-2026-0001.
create or replace function public.next_order_number()
returns text
language sql
volatile
as $$
    select 'MT-' || to_char(now(), 'YYYY') || '-' ||
           lpad(nextval('public.order_number_seq')::text, 4, '0');
$$;

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    order_number text unique not null default public.next_order_number(),
    enquiry_id uuid references public.enquiries(id) on delete set null,
    customer_name text not null,
    phone text,
    email text,
    required_date date,
    fulfilment_type text check (fulfilment_type in ('delivery', 'pickup')),
    delivery_address text,
    subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
    discount numeric(10, 2) not null default 0 check (discount >= 0),
    delivery_charge numeric(10, 2) not null default 0 check (delivery_charge >= 0),
    total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
    advance_amount numeric(10, 2) not null default 0 check (advance_amount >= 0),
    payment_status text not null default 'pending'
        check (payment_status in ('pending', 'partial', 'paid', 'refunded')),
    status order_status not null default 'confirmed',
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.orders is
    'Orders created internally by the baker after an enquiry is confirmed. Private.';

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
    before update on public.orders
    for each row execute function public.set_updated_at();

create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_required_date on public.orders (required_date);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_enquiry on public.orders (enquiry_id);

-- --- Order items -----------------------------------------------------------
create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    product_name text,
    product_sku text,
    quantity numeric(10, 2) not null default 1 check (quantity > 0),
    unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
    line_total numeric(10, 2) not null default 0 check (line_total >= 0),
    customization text,
    created_at timestamptz not null default now()
);

comment on table public.order_items is
    'Line items. Multi-product and combo orders are supported from V1.';

create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_product on public.order_items (product_id);

-- >>>>>>>>>>>>>>>>>>>> 20260827090400_cms_and_media.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0005 — CMS: posts/reels, testimonials, site content, settings, media library
-- ---------------------------------------------------------------------------

-- --- Posts & reels ---------------------------------------------------------
-- Website-owned content. V1 does not publish to Instagram; it links out to it.
create table if not exists public.posts (
    id uuid primary key default gen_random_uuid(),
    title text,
    caption text,
    type media_type not null,
    storage_path text,
    media_url text,
    thumbnail_url text,
    instagram_url text,
    show_on_homepage boolean not null default true,
    published boolean not null default false,
    sort_order integer not null default 0,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.posts is
    'Reels and posts rendered on the website. Instagram publishing is a future integration.';

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
    before update on public.posts
    for each row execute function public.set_updated_at();

create index if not exists idx_posts_published on public.posts (published, sort_order);
create index if not exists idx_posts_homepage on public.posts (show_on_homepage, published);
create index if not exists idx_posts_type on public.posts (type, published);

-- --- Testimonials ----------------------------------------------------------
create table if not exists public.testimonials (
    id uuid primary key default gen_random_uuid(),
    customer_name text not null,
    message text not null,
    rating integer check (rating between 1 and 5),
    source text,
    screenshot_url text,
    published boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

drop trigger if exists set_testimonials_updated_at on public.testimonials;
create trigger set_testimonials_updated_at
    before update on public.testimonials
    for each row execute function public.set_updated_at();

create index if not exists idx_testimonials_published on public.testimonials (published, sort_order);

-- --- Editable website copy --------------------------------------------------
-- Keyed JSON blocks, e.g. 'home.hero'. The admin UI renders typed forms over
-- these so the baker never edits raw JSON.
create table if not exists public.site_content (
    id uuid primary key default gen_random_uuid(),
    content_key text unique not null,
    content jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

comment on table public.site_content is
    'Publicly readable website copy blocks, keyed by dotted path e.g. home.hero.';

drop trigger if exists set_site_content_updated_at on public.site_content;
create trigger set_site_content_updated_at
    before update on public.site_content
    for each row execute function public.set_updated_at();

-- --- Site settings ----------------------------------------------------------
-- Split from site_content because some settings are operational rather than
-- copy, and a few must never reach the browser.
create table if not exists public.site_settings (
    id uuid primary key default gen_random_uuid(),
    setting_key text unique not null,
    setting_value jsonb not null default '{}'::jsonb,
    is_public boolean not null default true,
    updated_at timestamptz not null default now()
);

comment on column public.site_settings.is_public is
    'When false the row is admin-only and is never exposed through public reads.';

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
    before update on public.site_settings
    for each row execute function public.set_updated_at();

-- --- Media library ----------------------------------------------------------
-- A catalogue row for every uploaded object, so the baker can browse, reuse
-- and safely delete assets without opening the Supabase console.
create table if not exists public.media_assets (
    id uuid primary key default gen_random_uuid(),
    bucket text not null default 'media',
    storage_path text not null,
    public_url text,
    folder text not null default 'products'
        check (folder in ('products', 'posts', 'festive', 'about', 'testimonials', 'branding')),
    type media_type not null,
    file_name text not null,
    mime_type text not null,
    size_bytes bigint not null default 0 check (size_bytes >= 0),
    width integer,
    height integer,
    alt_text text,
    uploaded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (bucket, storage_path)
);

drop trigger if exists set_media_assets_updated_at on public.media_assets;
create trigger set_media_assets_updated_at
    before update on public.media_assets
    for each row execute function public.set_updated_at();

create index if not exists idx_media_assets_folder on public.media_assets (folder, created_at desc);
create index if not exists idx_media_assets_type on public.media_assets (type);

-- Usage count backs the "delete only if unused" rule in the media library.
create or replace function public.media_asset_usage(asset_url text, asset_path text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
    select (
        (select count(*) from public.product_media
          where storage_path = asset_path or media_url = asset_url or thumbnail_url = asset_url)
      + (select count(*) from public.posts
          where storage_path = asset_path or media_url = asset_url or thumbnail_url = asset_url)
      + (select count(*) from public.categories where image_url = asset_url)
      + (select count(*) from public.collections where cover_image = asset_url)
      + (select count(*) from public.testimonials where screenshot_url = asset_url)
    )::integer;
$$;

revoke all on function public.media_asset_usage(text, text) from public;
grant execute on function public.media_asset_usage(text, text) to authenticated;

-- >>>>>>>>>>>>>>>>>>>> 20260827090500_audit_and_rate_limit.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0006 — Lightweight audit trail and rate limiting
-- ---------------------------------------------------------------------------

create table if not exists public.admin_activity_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text,
    entity_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

comment on table public.admin_activity_logs is
    'Deliberately shallow audit log: order status changes, product create/delete, content updates.';

create index if not exists idx_admin_logs_created_at on public.admin_activity_logs (created_at desc);
create index if not exists idx_admin_logs_entity on public.admin_activity_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Rate limiting
--
-- The public enquiry and analytics endpoints run on serverless functions, so
-- an in-process counter would reset per instance and leak across regions.
-- Postgres is already a shared dependency, so the counter lives here. Rows are
-- keyed by a coarse bucket (route + hashed IP) and swept on write.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_hits (
    id bigserial primary key,
    bucket_key text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_bucket
    on public.rate_limit_hits (bucket_key, created_at desc);

create or replace function public.check_rate_limit(
    p_bucket_key text,
    p_max_hits integer,
    p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    hit_count integer;
    window_start timestamptz := now() - make_interval(secs => p_window_seconds);
begin
    -- Opportunistic sweep so the table cannot grow without bound.
    delete from public.rate_limit_hits
     where created_at < now() - interval '1 day';

    select count(*) into hit_count
      from public.rate_limit_hits
     where bucket_key = p_bucket_key
       and created_at >= window_start;

    if hit_count >= p_max_hits then
        return false;
    end if;

    insert into public.rate_limit_hits (bucket_key) values (p_bucket_key);
    return true;
end;
$$;

comment on function public.check_rate_limit is
    'Returns true when the request is allowed and records the hit; false when the bucket is exhausted.';

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;

-- >>>>>>>>>>>>>>>>>>>> 20260827090600_analytics_functions.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0007 — Dashboard analytics
--
-- These aggregate in Postgres rather than in the application. The dashboard
-- must stay fast as enquiry/order volume grows, and pulling raw rows into a
-- serverless function to count them in JavaScript would not.
--
-- Every function is SECURITY DEFINER (it reads private tables) and therefore
-- opens with an explicit is_admin() gate.
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard_kpis()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    result jsonb;
    month_start date := date_trunc('month', now())::date;
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    select jsonb_build_object(
        'new_enquiries', (
            select count(*) from public.enquiries where status = 'new'
        ),
        'active_orders', (
            select count(*) from public.orders
             where status in ('confirmed', 'preparing', 'ready', 'out_for_delivery')
        ),
        'orders_due_today', (
            select count(*) from public.orders
             where required_date = current_date
               and status <> 'cancelled'
        ),
        'monthly_orders', (
            select count(*) from public.orders
             where created_at >= month_start
               and status <> 'cancelled'
        ),
        'monthly_revenue', (
            select coalesce(sum(total_amount), 0) from public.orders
             where created_at >= month_start
               and status <> 'cancelled'
        ),
        'conversion_rate', (
            -- Share of enquiries received this month that became orders.
            select case
                when count(*) = 0 then 0
                else round(
                    count(*) filter (where status = 'converted')::numeric * 100 / count(*), 1
                )
            end
            from public.enquiries
            where created_at >= month_start
        ),
        'active_products', (
            select count(*) from public.products where is_active
        ),
        'available_today', (
            select count(*) from public.products where is_active and available_today
        ),
        'published_posts', (
            select count(*) from public.posts where published
        )
    ) into result;

    return result;
end;
$$;

-- --- Most enquired products -------------------------------------------------
create or replace function public.admin_most_enquired(p_days integer default 30, p_limit integer default 8)
returns table (product_name text, product_sku text, enquiry_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    return query
    select coalesce(e.product_name, 'General enquiry') as product_name,
           e.product_sku,
           count(*) as enquiry_count
      from public.enquiries e
     where e.created_at >= now() - make_interval(days => p_days)
       and e.status <> 'spam'
     group by 1, 2
     order by enquiry_count desc
     limit p_limit;
end;
$$;

-- --- Lead sources -----------------------------------------------------------
-- utm_source is the signal; anything unlabelled is reported as Direct so the
-- percentages always add up to 100.
create or replace function public.admin_lead_sources(p_days integer default 30)
returns table (source text, lead_count bigint, share numeric)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    total bigint;
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    select count(*) into total
      from public.enquiries
     where created_at >= now() - make_interval(days => p_days)
       and status <> 'spam';

    if total = 0 then
        return;
    end if;

    return query
    select coalesce(nullif(lower(e.utm_source), ''), 'direct') as source,
           count(*) as lead_count,
           round(count(*)::numeric * 100 / total, 1) as share
      from public.enquiries e
     where e.created_at >= now() - make_interval(days => p_days)
       and e.status <> 'spam'
     group by 1
     order by lead_count desc;
end;
$$;

-- --- Enquiry funnel ---------------------------------------------------------
create or replace function public.admin_enquiry_funnel(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    since timestamptz := now() - make_interval(days => p_days);
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    return jsonb_build_object(
        'enquiry_clicks', (
            select count(*) from public.enquiry_events
             where event_type = 'product_enquiry_click' and created_at >= since
        ),
        'submitted', (
            select count(*) from public.enquiries
             where created_at >= since and status <> 'spam'
        ),
        'contacted', (
            select count(*) from public.enquiries
             where created_at >= since and status in ('contacted', 'converted')
        ),
        'converted', (
            select count(*) from public.enquiries
             where created_at >= since and status = 'converted'
        ),
        'delivered', (
            select count(*) from public.orders
             where created_at >= since and status = 'delivered'
        )
    );
end;
$$;

-- --- Revenue ----------------------------------------------------------------
create or replace function public.admin_revenue_summary(
    p_from date default null,
    p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    custom_total numeric;
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    if p_from is not null and p_to is not null then
        select coalesce(sum(total_amount), 0) into custom_total
          from public.orders
         where status <> 'cancelled'
           and created_at::date between p_from and p_to;
    end if;

    return jsonb_build_object(
        'today', (
            select coalesce(sum(total_amount), 0) from public.orders
             where status <> 'cancelled' and created_at::date = current_date
        ),
        'this_week', (
            select coalesce(sum(total_amount), 0) from public.orders
             where status <> 'cancelled' and created_at >= date_trunc('week', now())
        ),
        'this_month', (
            select coalesce(sum(total_amount), 0) from public.orders
             where status <> 'cancelled' and created_at >= date_trunc('month', now())
        ),
        'outstanding', (
            select coalesce(sum(total_amount - advance_amount), 0) from public.orders
             where status <> 'cancelled' and payment_status <> 'paid'
        ),
        'custom', custom_total
    );
end;
$$;

-- Only signed-in users may call these; the is_admin() gate inside does the
-- real authorisation work.
revoke all on function public.admin_dashboard_kpis() from public;
revoke all on function public.admin_most_enquired(integer, integer) from public;
revoke all on function public.admin_lead_sources(integer) from public;
revoke all on function public.admin_enquiry_funnel(integer) from public;
revoke all on function public.admin_revenue_summary(date, date) from public;

grant execute on function public.admin_dashboard_kpis() to authenticated;
grant execute on function public.admin_most_enquired(integer, integer) to authenticated;
grant execute on function public.admin_lead_sources(integer) to authenticated;
grant execute on function public.admin_enquiry_funnel(integer) to authenticated;
grant execute on function public.admin_revenue_summary(date, date) to authenticated;

-- >>>>>>>>>>>>>>>>>>>> 20260827090700_row_level_security.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0008 — Row Level Security
--
-- Model:
--   * anon        — may read only rows that are explicitly published/active.
--                   Never reads customer data. Never writes anything, anywhere.
--   * authenticated with an active admin_users row — full CRUD.
--   * service_role — bypasses RLS. Used only by trusted server code (the
--                    enquiry intake route, analytics intake, uploads).
--
-- Public writes deliberately have NO policy: the enquiry form posts to a
-- server route that validates, rate-limits and then inserts with the service
-- role. That keeps spam control server-side instead of trusting the browser.
-- ---------------------------------------------------------------------------

alter table public.admin_users          enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.product_media        enable row level security;
alter table public.collections          enable row level security;
alter table public.collection_products  enable row level security;
alter table public.enquiries            enable row level security;
alter table public.enquiry_events       enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.posts                enable row level security;
alter table public.testimonials         enable row level security;
alter table public.site_content         enable row level security;
alter table public.site_settings        enable row level security;
alter table public.media_assets         enable row level security;
alter table public.admin_activity_logs  enable row level security;
alter table public.rate_limit_hits      enable row level security;

-- ===========================================================================
-- Admin roster
-- ===========================================================================
drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users
    for select to authenticated
    using (public.is_admin());

-- Only an owner may change who has access. Prevents a staff account from
-- promoting itself.
drop policy if exists admin_users_write on public.admin_users;
create policy admin_users_write on public.admin_users
    for all to authenticated
    using (public.admin_role() = 'owner')
    with check (public.admin_role() = 'owner');

-- ===========================================================================
-- Publicly readable catalogue
-- ===========================================================================
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
    for select to anon, authenticated
    using (is_active);

drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
    for select to anon, authenticated
    using (is_active);

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- Media follows the visibility of its parent product.
drop policy if exists product_media_public_read on public.product_media;
create policy product_media_public_read on public.product_media
    for select to anon, authenticated
    using (
        exists (
            select 1 from public.products p
             where p.id = product_media.product_id and p.is_active
        )
    );

drop policy if exists product_media_admin_all on public.product_media;
create policy product_media_admin_all on public.product_media
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists collections_public_read on public.collections;
create policy collections_public_read on public.collections
    for select to anon, authenticated
    using (active);

drop policy if exists collections_admin_all on public.collections;
create policy collections_admin_all on public.collections
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists collection_products_public_read on public.collection_products;
create policy collection_products_public_read on public.collection_products
    for select to anon, authenticated
    using (
        exists (
            select 1 from public.collections c
             where c.id = collection_products.collection_id and c.active
        )
        and exists (
            select 1 from public.products p
             where p.id = collection_products.product_id and p.is_active
        )
    );

drop policy if exists collection_products_admin_all on public.collection_products;
create policy collection_products_admin_all on public.collection_products
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Publicly readable content
-- ===========================================================================
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
    for select to anon, authenticated
    using (published);

drop policy if exists posts_admin_all on public.posts;
create policy posts_admin_all on public.posts
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials
    for select to anon, authenticated
    using (published);

drop policy if exists testimonials_admin_all on public.testimonials;
create policy testimonials_admin_all on public.testimonials
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read on public.site_content
    for select to anon, authenticated
    using (true);

drop policy if exists site_content_admin_all on public.site_content;
create policy site_content_admin_all on public.site_content
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- Only rows flagged public are exposed; operational settings stay internal.
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
    for select to anon, authenticated
    using (is_public);

drop policy if exists site_settings_admin_all on public.site_settings;
create policy site_settings_admin_all on public.site_settings
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Private: customer data, operations, internals
-- No anon policy exists on any table below, by design.
-- ===========================================================================
drop policy if exists enquiries_admin_all on public.enquiries;
create policy enquiries_admin_all on public.enquiries
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists enquiry_events_admin_all on public.enquiry_events;
create policy enquiry_events_admin_all on public.enquiry_events
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists media_assets_admin_all on public.media_assets;
create policy media_assets_admin_all on public.media_assets
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- Audit rows are readable but never editable from the client: history that can
-- be rewritten is not history. Inserts happen through the service role.
drop policy if exists admin_logs_select on public.admin_activity_logs;
create policy admin_logs_select on public.admin_activity_logs
    for select to authenticated
    using (public.is_admin());

-- rate_limit_hits intentionally has RLS enabled and zero policies: it is
-- reachable only by the service role, via check_rate_limit().

-- >>>>>>>>>>>>>>>>>>>> 20260828090000_product_instagram_source.sql <<<<<<<<<<<<<<<<<<<<

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

-- >>>>>>>>>>>>>>>>>>>> 20260828090100_grants.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0011 — Explicit role privileges
--
-- RLS decides WHICH ROWS a role may see. Table-level GRANTs decide whether the
-- role may touch the table at all. Both are required: a table with perfect
-- policies and no grant is invisible to PostgREST, which reports it as
-- "Could not find the table in the schema cache" — a confusing error that
-- looks like the table is missing.
--
-- Supabase usually applies these grants automatically via default privileges,
-- but that depends on project age and settings. Setting them explicitly makes
-- the schema reproducible on any project instead of relying on the platform.
--
-- Deliberately conservative: anon is granted SELECT only on the tables the
-- public site is meant to read. Private tables get NO anon grant at all, so
-- customer data is protected by both the missing grant and the missing policy.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

-- --- Publicly readable -------------------------------------------------------
grant select on public.categories          to anon, authenticated;
grant select on public.products            to anon, authenticated;
grant select on public.product_media       to anon, authenticated;
grant select on public.collections         to anon, authenticated;
grant select on public.collection_products to anon, authenticated;
grant select on public.posts               to anon, authenticated;
grant select on public.testimonials        to anon, authenticated;
grant select on public.site_content        to anon, authenticated;
grant select on public.site_settings       to anon, authenticated;

-- --- Admin surface -----------------------------------------------------------
-- Signed-in users get full DML; `is_admin()` in the RLS policies is what
-- actually decides whether any row is affected.
grant select, insert, update, delete on public.categories          to authenticated;
grant select, insert, update, delete on public.products            to authenticated;
grant select, insert, update, delete on public.product_media       to authenticated;
grant select, insert, update, delete on public.collections         to authenticated;
grant select, insert, update, delete on public.collection_products to authenticated;
grant select, insert, update, delete on public.posts               to authenticated;
grant select, insert, update, delete on public.testimonials        to authenticated;
grant select, insert, update, delete on public.site_content        to authenticated;
grant select, insert, update, delete on public.site_settings       to authenticated;
grant select, insert, update, delete on public.enquiries           to authenticated;
grant select, insert, update, delete on public.enquiry_events      to authenticated;
grant select, insert, update, delete on public.orders              to authenticated;
grant select, insert, update, delete on public.order_items         to authenticated;
grant select, insert, update, delete on public.media_assets        to authenticated;
grant select, insert, update, delete on public.admin_users         to authenticated;
grant select                         on public.admin_activity_logs to authenticated;

-- Orders default their number from a sequence, so inserting needs USAGE on it.
grant usage, select on sequence public.order_number_seq to authenticated;

-- --- Future tables -----------------------------------------------------------
-- So a later migration cannot reintroduce the "invisible table" problem.
alter default privileges in schema public
    grant select on tables to anon, authenticated;

alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
    grant usage, select on sequences to authenticated;

-- Nothing is granted to anon on enquiries, enquiry_events, orders,
-- order_items, media_assets, admin_users, admin_activity_logs or
-- rate_limit_hits. That is intentional and must stay that way.

-- >>>>>>>>>>>>>>>>>>>> seed.sql <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- Magic T-treats — seed data
--
-- Safe to run repeatedly: every statement is upsert-shaped.
--
-- Deliberately contains NO customer data. Enquiries and orders are left empty
-- so the dashboard's first numbers are real ones, and so no invented personal
-- data ever reaches a production database.
--
-- Media URLs are left null: the baker uploads real photography through the
-- Media Library, and the UI renders proper empty states until then.
-- ---------------------------------------------------------------------------

-- === Categories ============================================================
insert into public.categories (name, slug, description, sort_order, is_active) values
    ('Cookies',    'cookies',    'Slow-baked, wholesome and never too sweet.',            1, true),
    ('Dry Cakes',  'dry-cakes',  'Tea-time loaves baked in small batches.',               2, true),
    ('Brownies',   'brownies',   'Dense, fudgy and unapologetically chocolatey.',         3, true),
    ('Choco Bites','choco-bites','Bite-sized indulgence, handmade one tray at a time.',   4, true),
    ('Chocolates', 'chocolates', 'Hand-moulded chocolates in a range of shapes.',         5, true),
    ('Muffins',    'muffins',    'Soft, freshly baked and best eaten warm.',              6, true),
    ('Sugar-Free', 'sugar-free', 'All of the treat, none of the refined sugar.',          7, true),
    ('Gift Boxes', 'gift-boxes', 'Thoughtfully curated boxes for every occasion.',        8, true)
on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order;

-- === Products ==============================================================
insert into public.products (
    sku, category_id, name, slug, short_description, description,
    starting_price, price_label, highlight_tags,
    is_sugar_free, is_eggless, is_customizable, is_bestseller, is_seasonal,
    available_today, is_active, sort_order
)
select v.sku,
       c.id,
       v.name, v.slug, v.short_description, v.description,
       v.starting_price, v.price_label, v.highlight_tags,
       v.is_sugar_free, v.is_eggless, v.is_customizable, v.is_bestseller, v.is_seasonal,
       v.available_today, true, v.sort_order
from (values
    ('CK-001', 'cookies', 'Oats & Jaggery Cookies',
     'oats-jaggery-cookies',
     'Rolled oats, jaggery and cold-pressed ghee. Crisp at the edge, chewy in the middle.',
     'Our everyday favourite. Made with rolled oats, unrefined jaggery and cold-pressed ghee, these cookies are baked low and slow so they keep their crunch for days. No refined sugar, no palm oil, no preservatives.',
     320.00, 'per 250g box', array['Handmade'], false, true, false, true, false, true, 1),

    ('CK-002', 'cookies', 'Almond Butter Cookies',
     'almond-butter-cookies',
     'Stone-ground almond butter folded through a short, buttery dough.',
     'Stone-ground almond butter gives these a deep, nutty richness that you simply cannot get from almond flour alone. Finished with a whole roasted almond on top.',
     380.00, 'per 250g box', array['Handmade'], false, false, false, false, false, false, 2),

    ('CK-003', 'cookies', 'Ragi Choco Chip Cookies',
     'ragi-choco-chip-cookies',
     'Finger millet and dark chocolate. The wholesome cookie children actually finish.',
     'Finger millet (ragi) brings an earthy, malty depth that pairs beautifully with 55% dark chocolate chips. A genuinely nourishing cookie that does not taste like a compromise.',
     340.00, 'per 250g box', array['Limited Batch'], false, true, false, true, false, true, 3),

    ('DC-001', 'dry-cakes', 'Whole Wheat Banana Loaf',
     'whole-wheat-banana-loaf',
     'Overripe bananas, whole wheat and walnuts. Nothing else.',
     'Baked with fully ripened bananas so it needs very little added sweetness. Whole wheat flour keeps it hearty, and toasted walnuts run right through the loaf.',
     450.00, 'per loaf', array['Handmade'], false, true, false, true, false, false, 4),

    ('DC-002', 'dry-cakes', 'Orange & Almond Tea Cake',
     'orange-almond-tea-cake',
     'Fresh orange zest, ground almonds and a whisper of cardamom.',
     'A fragrant, moist tea cake built on ground almonds and the zest of whole oranges. Light enough for breakfast, elegant enough to gift.',
     520.00, 'per loaf', array[]::text[], false, false, true, false, false, false, 5),

    ('BR-001', 'brownies', 'Classic Fudge Brownies',
     'classic-fudge-brownies',
     'Dense, glossy-topped and properly fudgy. Our most-ordered treat.',
     'Made with couverture chocolate and cocoa for a double hit of depth. Baked deliberately underdone in the centre so the middle stays molten-soft. Sold as a tray of nine.',
     480.00, 'per tray of 9', array['Handmade'], false, false, true, true, false, true, 6),

    ('BR-002', 'brownies', 'Walnut Brownie Squares',
     'walnut-brownie-squares',
     'The classic, loaded with toasted walnuts.',
     'Everything the classic fudge brownie is, with generously toasted walnuts folded through and scattered on top.',
     540.00, 'per tray of 9', array[]::text[], false, false, true, false, false, false, 7),

    ('CB-001', 'choco-bites', 'Signature Choco Bites',
     'signature-choco-bites',
     'Two-bite rounds of dark chocolate, dates and roasted nuts.',
     'No refined sugar at all. The sweetness comes entirely from Medjool dates. Rolled by hand, coated in 62% dark chocolate and finished with a dusting of cocoa.',
     420.00, 'per box of 12', array['Handmade', 'Limited Batch'], true, true, true, true, false, true, 8),

    ('CB-002', 'choco-bites', 'Coconut Chocolate Bites',
     'coconut-chocolate-bites',
     'Desiccated coconut and dark chocolate, rolled small.',
     'Chewy coconut centres enrobed in dark chocolate. Naturally eggless and a reliable crowd-pleaser in gift boxes.',
     400.00, 'per box of 12', array[]::text[], false, true, true, false, false, false, 9),

    ('CH-001', 'chocolates', 'Handmade Assorted Chocolates',
     'handmade-assorted-chocolates',
     'A mixed box of hand-moulded chocolates in assorted shapes.',
     'Hand-tempered and hand-moulded in small batches. The assortment rotates with the season and can be tailored to your preferred fillings.',
     550.00, 'per box of 16', array['Handmade'], false, true, true, true, false, false, 10),

    ('CH-002', 'chocolates', 'Custom Shape Chocolates',
     'custom-shape-chocolates',
     'Hearts, stars, letters and logos, moulded to your occasion.',
     'Tell us the occasion and we will mould to match: hearts for anniversaries, alphabets for a name, or your company logo for corporate gifting. Minimum order applies.',
     600.00, 'starting, per box', array['Handmade'], false, true, true, false, false, false, 11),

    ('MF-001', 'muffins', 'Double Chocolate Muffins',
     'double-chocolate-muffins',
     'Cocoa batter, chocolate chunks, domed tops.',
     'A proper bakery-style muffin: high domed top, tender crumb and chunks of dark chocolate that stay soft even once cooled.',
     360.00, 'per box of 6', array[]::text[], false, false, false, false, false, true, 12),

    ('MF-002', 'muffins', 'Banana Walnut Muffins',
     'banana-walnut-muffins',
     'Everyday muffins with real banana and toasted walnut.',
     'Lightly sweetened with jaggery and built on real mashed banana. A lunchbox staple.',
     340.00, 'per box of 6', array[]::text[], false, true, false, false, false, false, 13),

    ('SF-001', 'sugar-free', 'Sugar-Free Date & Nut Bars',
     'sugar-free-date-nut-bars',
     'Dates, almonds, cashews and seeds. No added sugar whatsoever.',
     'Pressed, not baked. Just dates, nuts and seeds. Nothing added, nothing refined. A favourite with customers managing their sugar intake.',
     460.00, 'per box of 10', array['Handmade'], true, true, false, true, false, true, 14),

    ('SF-002', 'sugar-free', 'Sugar-Free Dark Chocolate Slab',
     'sugar-free-dark-chocolate-slab',
     'Stevia-sweetened dark chocolate, hand-poured and topped with nuts.',
     'Hand-poured in small batches using a stevia-sweetened dark couverture, then topped with almonds and pistachios.',
     490.00, 'per 200g slab', array[]::text[], true, true, true, false, false, false, 15),

    ('GB-001', 'gift-boxes', 'Signature Gift Box',
     'signature-gift-box',
     'A curated selection of our most-loved treats in one box.',
     'The easiest way to gift. A hand-packed assortment of cookies, choco bites and chocolates, finished with ribbon and a handwritten note card. Contents can be customised.',
     1200.00, 'starting', array['Handmade'], false, false, true, true, false, false, 16),

    ('GB-002', 'gift-boxes', 'Corporate Gifting Hamper',
     'corporate-gifting-hamper',
     'Bulk-friendly hampers with optional branded packaging.',
     'Built for teams and clients. Choose the contents, add your logo to the sleeve, and we will handle packing and coordinated delivery across Tricity. Bulk pricing on request.',
     1500.00, 'starting, bulk pricing', array[]::text[], false, false, true, false, false, false, 17),

    ('GB-003', 'gift-boxes', 'Festive Celebration Box',
     'festive-celebration-box',
     'A seasonal box that changes with the festival.',
     'Our rotating festive box. The assortment is built fresh for each occasion, from Rakhi through to New Year. Packaging is matched to the festival.',
     1400.00, 'starting', array['Limited Batch'], false, false, true, false, true, false, 18)
) as v(sku, category_slug, name, slug, short_description, description,
       starting_price, price_label, highlight_tags,
       is_sugar_free, is_eggless, is_customizable, is_bestseller, is_seasonal,
       available_today, sort_order)
join public.categories c on c.slug = v.category_slug
on conflict (sku) do update
    set name = excluded.name,
        category_id = excluded.category_id,
        short_description = excluded.short_description,
        description = excluded.description,
        starting_price = excluded.starting_price,
        price_label = excluded.price_label,
        sort_order = excluded.sort_order;

-- === Festive collections ===================================================
insert into public.collections (name, slug, description, featured, active, sort_order) values
    ('Raksha Bandhan', 'raksha-bandhan',
     'Chocolate and treat boxes made for sending across the miles.', true, true, 1),
    ('Diwali Gifting', 'diwali-gifting',
     'Festive hampers for family, neighbours and colleagues.', true, true, 2),
    ('Corporate Gifts', 'corporate-gifts',
     'Bulk hampers with optional branded packaging for teams and clients.', false, true, 3),
    ('Christmas & New Year', 'christmas-new-year',
     'Seasonal bakes and hand-moulded chocolates for the year end.', false, true, 4)
on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        featured = excluded.featured,
        sort_order = excluded.sort_order;

insert into public.collection_products (collection_id, product_id, sort_order)
select c.id, p.id, v.sort_order
from (values
    ('raksha-bandhan',     'CH-001', 1),
    ('raksha-bandhan',     'GB-001', 2),
    ('raksha-bandhan',     'CB-001', 3),
    ('diwali-gifting',     'GB-003', 1),
    ('diwali-gifting',     'CH-001', 2),
    ('diwali-gifting',     'SF-001', 3),
    ('corporate-gifts',    'GB-002', 1),
    ('corporate-gifts',    'CH-002', 2),
    ('christmas-new-year', 'GB-003', 1),
    ('christmas-new-year', 'BR-001', 2)
) as v(collection_slug, sku, sort_order)
join public.collections c on c.slug = v.collection_slug
join public.products p on p.sku = v.sku
on conflict (collection_id, product_id) do update
    set sort_order = excluded.sort_order;

-- === Testimonials ==========================================================
-- Illustrative starter copy so the section is not empty on first run. The
-- baker replaces these with real customer words from the dashboard.
insert into public.testimonials (customer_name, message, rating, source, published, sort_order) values
    ('Priya S.',
     'Ordered the sugar-free date bars for my father and he finished the box in two days. Finally something I can give him without worrying.',
     5, 'Instagram', true, 1),
    ('Ankit & Meera',
     'We ordered eighty gift boxes for our wedding favours. Packed beautifully, delivered on time across three addresses in Mohali. Guests are still asking where they were from.',
     5, 'WhatsApp', true, 2),
    ('Ritu K.',
     'The brownies are genuinely the best I have had in Chandigarh, and I have tried a lot of them. Fudgy the whole way through.',
     5, 'Instagram', true, 3)
on conflict do nothing;

-- === Starter reels =========================================================
-- The two bundled videos, registered as real posts so they are manageable
-- from the dashboard. The app also falls back to these files when the table
-- is empty, so the section works before this seed is ever run.
insert into public.posts (title, caption, type, media_url, show_on_homepage, published, sort_order, published_at)
values
    ('Scoopable cookies, fresh from the tin',
     'Big, gooey and best eaten warm.',
     'video', '/media/scoopable-cookies-baking-reel.mp4', true, true, 1, now()),
    ('A batch coming together',
     'Small batches, mixed and packed by hand.',
     'video', '/media/home-bakery-kitchen-reel.mp4', true, true, 2, now())
on conflict do nothing;

-- === Website copy ==========================================================
insert into public.site_content (content_key, content) values
('home.hero', jsonb_build_object(
    'heading', 'Freshly Baked. Thoughtfully Made.',
    'description', 'Healthy homemade treats, handcrafted chocolates and thoughtful gift boxes prepared in small batches for everyday cravings, celebrations and gifting.',
    'primaryButton', 'Explore Treats',
    'secondaryButton', 'Enquire on Instagram',
    'badges', jsonb_build_array('Homemade', 'Custom Orders', 'Sugar-Free Options', 'Tricity Delivery', 'Pickup Available'),
    'mediaType', 'image',
    'mediaUrl', null
)),
('home.trust', jsonb_build_object(
    'heading', 'Why people keep coming back',
    'items', jsonb_build_array(
        jsonb_build_object('title', 'Baked to order', 'description', 'Nothing sits on a shelf. Every batch is baked after your order is confirmed.'),
        jsonb_build_object('title', 'Honest ingredients', 'description', 'Jaggery, whole grains and cold-pressed ghee. No preservatives, no palm oil.'),
        jsonb_build_object('title', 'Made by one pair of hands', 'description', 'A home kitchen, not a factory line. Every box is packed personally.'),
        jsonb_build_object('title', 'Built around your occasion', 'description', 'Sugar-free, eggless or custom-shaped. Tell us what you need.')
    )
)),
('home.available_today', jsonb_build_object(
    'heading', 'Baking Today',
    'description', 'Ready from the kitchen right now, while stocks last.',
    'note', 'Limited batches available'
)),
('home.featured', jsonb_build_object(
    'eyebrow', 'This season',
    'heading', 'The Viral Scoopable Cookies',
    'description', 'Big, gooey and unapologetically indulgent, baked in a tin and meant to be scooped warm, straight from the box. Made to order in four flavours.',
    'points', jsonb_build_array(
        'Classic, Rich Chocolate, Nutella or Half & Half',
        'Baked fresh the day it reaches you',
        'Gift-ready tins, perfect for festivals and celebrations'
    ),
    'ctaLabel', 'Order Scoopable Cookies',
    'note', 'Please order a day in advance',
    'imageUrl', '/media/viral-scoopable-cookies-molten-chocolate.webp',
    'imageAlt', 'A spoon lifting a warm, gooey scoop from a tin of chocolate chip cookie, melted chocolate stretching away from it.'
)),
('home.bestsellers', jsonb_build_object(
    'heading', 'Most Loved Treats',
    'description', 'The ones our customers order again and again.'
)),
('home.custom_orders', jsonb_build_object(
    'heading', 'Made For Your Occasion',
    'description', 'Birthdays, weddings, corporate hampers or a box put together exactly the way you want it. Tell us the occasion and we will build around it.',
    'bullets', jsonb_build_array(
        'Custom shapes, flavours and fillings',
        'Sugar-free and eggless options across the menu',
        'Personalised packaging, notes and branding',
        'Bulk orders for celebrations and corporate gifting'
    ),
    'ctaLabel', 'Start a Custom Order'
)),
('home.testimonials', jsonb_build_object(
    'heading', 'Kind Words',
    'description', 'From the people who order again.'
)),
('home.instagram', jsonb_build_object(
    'heading', 'From the Kitchen',
    'description', 'Fresh bakes, behind the scenes and what is coming next.'
)),
('home.delivery', jsonb_build_object(
    'heading', 'Delivery & Pickup',
    'description', 'Wherever you are in Tricity, we will get your box to you.',
    'cards', jsonb_build_array(
        jsonb_build_object('title', 'Tricity Delivery', 'description', 'Delivery available across Chandigarh, Mohali and Panchkula. Charges are confirmed when you order.'),
        jsonb_build_object('title', 'Pickup', 'description', 'Prefer to collect? Pickup is available by appointment once your order is ready.'),
        jsonb_build_object('title', 'Bulk & Gifting', 'description', 'Advance orders for celebrations, wedding favours and corporate gifting. Please allow lead time.')
    )
)),
('home.final_cta', jsonb_build_object(
    'heading', 'Something to celebrate?',
    'description', 'Send us a message with the occasion and the date. We will take it from there.',
    'primaryButton', 'Enquire Now'
)),
('about.story', jsonb_build_object(
    'heading', 'Meet the Heart Behind Magic T Treats',
    'bakerName', 'The baker behind Magic T-treats',
    'paragraphs', jsonb_build_array(
        'For her, food has always been more than something made in the kitchen. It has been a way of bringing people closer, creating small moments of happiness, and turning ordinary days into memories worth keeping.',
        'Some of her fondest memories began with cooking for the people around her and watching their faces light up after the very first bite. That feeling of making someone happy through food slowly became something deeply meaningful to her.',
        'A big part of that love came from home.',
        'Growing up, she watched her mother bake cakes and prepare treats for the family. The warmth of the kitchen, the aroma of something baking in the oven, and the excitement of everyone waiting to taste it stayed with her. Years later, she found herself doing the same thing, only this time with her own ideas, her own flavours, and her own little style.',
        'What started as curiosity slowly turned into creativity.',
        'She began experimenting with recipes, adding her personal touch, making treats healthier where possible, playing with chocolates, cookies, brownies, cakes and gifting combinations, and creating something that felt uniquely hers.',
        'And somewhere between all the experimenting, tasting, laughter and a little Panda Chef inspiration, Magic T Treats was born.',
        'The name has its own little mystery too.',
        'The T in Magic T Treats represents a secret ingredient. It is something that remains part of the magic behind every recipe. Maybe it is an ingredient. Maybe it is a feeling. Maybe it is simply the love and thought that goes into making every batch special.',
        'That secret is staying in the kitchen.',
        'For the last five years, she has been serving customers with handmade baked treats created with care, patience and a genuine love for what she does.',
        'Every cookie, brownie, chocolate, cake and gift box carries a little part of that journey. From watching her mother bake, to finding her own style, to seeing customers come back for another box, every step has made Magic T Treats what it is today.',
        'For her, the most rewarding part is still the simplest one.',
        'Seeing someone take a bite, smile, and enjoy something she created.',
        'Because Magic T Treats was never just about baking.',
        'It is about sharing happiness, one treat at a time.'
    ),
    'signature', 'Made with memories. Made with love. Made with a little magic.',
    'photoUrl', '/media/tavishi-manohar-home-baker-tricity.webp',
    'photoAlt', 'The baker behind Magic T-treats, in a chef''s hat and apron, holding a plate of handmade chocolate truffles.'
)),
('about.philosophy', jsonb_build_object(
    'heading', 'How we bake',
    'values', jsonb_build_array(
        jsonb_build_object('title', 'Small batches, always', 'description', 'Volume is capped on purpose. Quality is easier to hold when the tray is small.'),
        jsonb_build_object('title', 'Ingredients you can name', 'description', 'Whole grains, jaggery, real butter and couverture chocolate. Nothing that needs explaining.'),
        jsonb_build_object('title', 'Made for real diets', 'description', 'Sugar-free and eggless are not afterthoughts here. They are half of what we bake.'),
        jsonb_build_object('title', 'Packed like a gift', 'description', 'Every box is packed by hand, because most of them are going to someone who matters.')
    )
)),
('footer.content', jsonb_build_object(
    'tagline', 'Small-batch bakes, handmade chocolates and thoughtful gifting across Tricity.',
    'note', 'Baked fresh to order in a home kitchen.'
))
on conflict (content_key) do nothing;

-- === Settings ==============================================================
insert into public.site_settings (setting_key, setting_value, is_public) values
('general', jsonb_build_object(
    'bakeryName', 'Magic T-treats',
    'tagline', 'Homemade Chocolates and Cakes',
    'phone', '',
    'email', '',
    'serviceArea', 'Chandigarh, Mohali & Panchkula',
    'logoUrl', '/brand/logo.png',
    'faviconUrl', null
), true),
('social', jsonb_build_object(
    'instagramUrl', 'https://www.instagram.com/magicttreats_/',
    'instagramUsername', 'magicttreats_',
    'whatsappNumber', ''
), true),
('fulfilment', jsonb_build_object(
    'deliveryText', 'Delivery available across Chandigarh, Mohali and Panchkula.',
    'pickupText', 'Pickup available by appointment once your order is ready.',
    'serviceAreas', jsonb_build_array('Chandigarh', 'Mohali', 'Panchkula', 'Zirakpur')
), true),
('seo', jsonb_build_object(
    'defaultTitle', 'Magic T-treats | Home Bakery in Tricity',
    'defaultDescription', 'Healthy homemade cookies, brownies, handmade chocolates and festive gift boxes, baked in small batches and delivered across Chandigarh, Mohali and Panchkula.',
    'ogImageUrl', '/brand/og.png',
    'keywords', jsonb_build_array(
        'homemade bakery Tricity', 'healthy cookies Chandigarh', 'brownies Chandigarh',
        'handmade chocolates Chandigarh', 'sugar-free bakery Tricity',
        'custom chocolate gifts Chandigarh', 'festive gift boxes',
        'home bakery Panchkula', 'bakery Mohali'
    )
), true),
('uploads', jsonb_build_object(
    'maxImageMb', 10,
    'maxVideoMb', 100
), false)
on conflict (setting_key) do nothing;

-- >>>>>>>>>>>>>>>>>>>> 20260827090800_storage.sql (last: failure-tolerant) <<<<<<<<<<<<<<<<<<<<

-- ---------------------------------------------------------------------------
-- 0009 — Supabase Storage bucket and object policies
--
-- A single public `media` bucket, foldered by purpose. Reads are public
-- because every asset in it is intended for the website; writes require an
-- active admin.
--
-- The per-file size ceiling here is a hard backstop. The application enforces
-- its own configurable, type-aware limits (10 MB images / 100 MB video)
-- before the upload is attempted.
--
-- IMPORTANT: every statement below is wrapped so that a permissions error
-- cannot abort the rest of the setup script. Some Supabase projects do not
-- let the SQL Editor role create policies on `storage.objects`; when that
-- happens this raises a NOTICE and continues, and the bucket can be created
-- from the Storage UI instead. Without this guard, one restricted statement
-- silently prevents the seed data and every later migration from running.
-- ---------------------------------------------------------------------------

do $$
begin
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
        'media',
        'media',
        true,
        104857600, -- 100 MB
        array[
            'image/jpeg', 'image/png', 'image/webp', 'image/avif',
            'video/mp4', 'video/webm', 'video/quicktime'
        ]
    )
    on conflict (id) do update
        set public = excluded.public,
            file_size_limit = excluded.file_size_limit,
            allowed_mime_types = excluded.allowed_mime_types;

    raise notice 'Storage bucket "media" is ready.';
exception
    when insufficient_privilege then
        raise notice 'Could not create the "media" bucket (insufficient privilege). Create it manually: Storage -> New bucket -> name "media", Public ON.';
    when others then
        raise notice 'Could not create the "media" bucket: %. Create it manually in Storage.', sqlerrm;
end
$$;

do $$
begin
    drop policy if exists "media public read" on storage.objects;
    create policy "media public read" on storage.objects
        for select to anon, authenticated
        using (bucket_id = 'media');

    drop policy if exists "media admin insert" on storage.objects;
    create policy "media admin insert" on storage.objects
        for insert to authenticated
        with check (bucket_id = 'media' and public.is_admin());

    drop policy if exists "media admin update" on storage.objects;
    create policy "media admin update" on storage.objects
        for update to authenticated
        using (bucket_id = 'media' and public.is_admin())
        with check (bucket_id = 'media' and public.is_admin());

    drop policy if exists "media admin delete" on storage.objects;
    create policy "media admin delete" on storage.objects
        for delete to authenticated
        using (bucket_id = 'media' and public.is_admin());

    raise notice 'Storage policies applied.';
exception
    when insufficient_privilege then
        raise notice 'Could not create storage policies (insufficient privilege). Add them from Storage -> Policies, or the bucket will reject uploads.';
    when others then
        raise notice 'Could not create storage policies: %', sqlerrm;
end
$$;
