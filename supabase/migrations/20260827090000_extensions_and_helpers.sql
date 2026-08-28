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
