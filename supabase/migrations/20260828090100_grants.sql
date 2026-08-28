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
