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
