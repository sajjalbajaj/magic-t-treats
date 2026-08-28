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
