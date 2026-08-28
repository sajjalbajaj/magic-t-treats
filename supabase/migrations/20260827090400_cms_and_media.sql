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
