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
