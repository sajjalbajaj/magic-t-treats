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
