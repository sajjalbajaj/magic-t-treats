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
