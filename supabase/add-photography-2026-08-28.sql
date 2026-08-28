-- ---------------------------------------------------------------------------
-- Photography  ·  2026-08-28
--
-- Run this once in the Supabase SQL editor, after deploying the build that
-- contains the new files in `public/media/`.
--
-- Before this runs the catalogue has NO photographs at all: `product_media` and
-- `posts` are both empty, so every product card falls back to the placeholder
-- and the gallery is empty. This attaches the new shoot.
--
-- Three things happen:
--   1. Two media files were renamed for SEO, so the stored paths that point at
--      them are updated. Do this first, or those two images 404.
--   2. Product photographs are attached, and the four festive collections get
--      cover images.
--   3. Lifestyle shots are published as posts, which feed the gallery and the
--      homepage slider.
--
-- On alt text: only the DESCRIPTIVE half is stored here. The house suffix
-- ("Magic T-treats, Magic t treats, Tashu, tavishi, Tavishi manohar") is added
-- by `lib/seo/alt-text.ts` when the page renders. Do not paste it into these
-- rows or it will appear twice.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

begin;

-- 1 --------------------------------------------------------------------------
-- Renamed files. `baker-portrait` and `featured-scoopable-cookies` were given
-- descriptive names; the database still points at the old ones.

update public.site_content
set content = replace(
        content::text,
        '/media/baker-portrait.webp',
        '/media/tavishi-manohar-home-baker-tricity.webp'
    )::jsonb,
    updated_at = now()
where content::text like '%/media/baker-portrait.webp%';

update public.site_content
set content = replace(
        content::text,
        '/media/featured-scoopable-cookies.webp',
        '/media/viral-scoopable-cookies-molten-chocolate.webp'
    )::jsonb,
    updated_at = now()
where content::text like '%/media/featured-scoopable-cookies.webp%';


-- 2 --------------------------------------------------------------------------
-- Product photographs.
--
-- Cleared and re-inserted by SKU so a re-run cannot pile up duplicates, and so
-- correcting a photo here is a one-line edit rather than an UPDATE hunt.
-- `storage_path` mirrors the public path: these files ship with the site rather
-- than living in the Storage bucket, but the column is NOT NULL and is the
-- honest record of where the bytes are.

do $photos$
declare
    shot record;
    pid uuid;
begin
    for shot in
        select * from (values
            ('GB-003', 'christmas-chocolate-gift-hamper',
             'Christmas gift hamper of brownies, cookies, chocolate truffles and layered cake slices'),
            ('GB-001', 'diwali-chocolate-gift-box',
             'Diwali gift box of cookies, brownies, chocolate truffles and roasted nuts, lit by diyas'),
            ('GB-002', 'corporate-gifting-chocolate-box',
             'Corporate gifting box of cookies, walnut brownies, chocolate truffles and chocolate dragees'),
            ('DC-002', 'orange-almond-tea-cake-tin',
             'Orange and almond tea cake topped with flaked almonds, in a branded tin'),
            ('CB-002', 'coconut-truffles-pink-gift-boxes',
             'Coconut chocolate bites in a pink gift box, with stacked gift boxes behind'),
            ('CH-001', 'assorted-chocolate-truffles-flavours',
             'Assorted handmade chocolate truffles in rose, coconut and almond flavours')
        ) as t(sku, file_stem, alt_keywords)
    loop
        select id into pid from public.products where products.sku = shot.sku;
        if pid is null then
            raise notice 'No product with SKU %, skipping photo', shot.sku;
            continue;
        end if;

        delete from public.product_media
        where product_id = pid
          and media_url = '/media/' || shot.file_stem || '.webp';

        insert into public.product_media
            (product_id, type, storage_path, media_url, alt_text, is_primary, sort_order)
        values
            (pid, 'image', 'media/' || shot.file_stem || '.webp',
             '/media/' || shot.file_stem || '.webp', shot.alt_keywords,
             -- Only becomes the primary if the product has none yet; the unique
             -- index allows exactly one and would reject a second.
             not exists (select 1 from public.product_media m
                         where m.product_id = pid and m.is_primary),
             0);
    end loop;
end
$photos$;


-- Collection covers.

update public.collections
set cover_image = '/media/christmas-chocolate-gift-hamper.webp', updated_at = now()
where slug = 'christmas-new-year';

update public.collections
set cover_image = '/media/diwali-chocolate-gift-box.webp', updated_at = now()
where slug = 'diwali-gifting';

update public.collections
set cover_image = '/media/corporate-gifting-chocolate-box.webp', updated_at = now()
where slug = 'corporate-gifts';

update public.collections
set cover_image = '/media/festive-gift-hamper-hand-wrapped.webp', updated_at = now()
where slug = 'raksha-bandhan';


-- 3 --------------------------------------------------------------------------
-- Posts: the gallery feed, and the homepage slider.
--
-- IMPORTANT: the homepage slider falls back to two built-in starter reels ONLY
-- while this table has no published homepage posts. Publishing anything here
-- replaces that fallback outright, so the two reels are inserted as real posts
-- as well. Leave them in, or the homepage loses its video.
--
-- What `show_on_homepage` actually controls, verified against the running site:
--   * the HERO SLIDER takes VIDEOS ONLY. `getReels()` in lib/data/public.ts
--     filters on type = 'video', so the two stills flagged below never reach
--     the arch. The hero runs two slides, not four.
--   * the "From the Kitchen" section takes every flagged post, video or still,
--     which is where those two images appear.
-- Everything published, flagged or not, appears in the gallery.

do $posts$
declare
    item record;
begin
    for item in
        select * from (values
            ('Scoopable cookies, fresh from the tin', 'video',
             'scoopable-cookies-baking-reel.mp4', true, 1),
            ('In the kitchen', 'video',
             'home-bakery-kitchen-reel.mp4', true, 2),
            ('Warm from the oven, straight into the tin', 'image',
             'scoopable-cookie-tin-molten-chocolate.webp', true, 3),
            ('Every hamper is wrapped by hand', 'image',
             'festive-gift-hamper-hand-wrapped.webp', true, 4),
            ('Plum cake and almond cakes, ready to gift', 'image',
             'plum-cake-and-almond-cakes-gift-set.webp', false, 5),
            ('Layered dessert jars, packed to travel', 'image',
             'dessert-jars-pink-gift-bags.webp', false, 6)
        ) as t(title, media_kind, file_name, on_homepage, position)
    loop
        delete from public.posts where media_url = '/media/' || item.file_name;

        insert into public.posts
            (title, type, storage_path, media_url,
             show_on_homepage, published, sort_order, published_at)
        values
            (item.title, item.media_kind::media_type,
             'media/' || item.file_name, '/media/' || item.file_name,
             item.on_homepage, true, item.position, now());
    end loop;
end
$posts$;

commit;


-- ---------------------------------------------------------------------------
-- Check it worked.
--
-- Expect: 6 product photos, 4 collections with covers, 6 published posts
-- (4 of them on the homepage), and no row pointing at a renamed file.
-- ---------------------------------------------------------------------------

select
    (select count(*) from public.product_media)                              as product_photos,
    (select count(*) from public.collections where cover_image is not null)  as collections_with_cover,
    (select count(*) from public.posts where published)                      as published_posts,
    (select count(*) from public.posts where published and show_on_homepage) as homepage_posts;

select p.sku, p.name, m.media_url, m.is_primary
from public.product_media m
join public.products p on p.id = m.product_id
order by p.sku;

-- Should return no rows.
select content_key
from public.site_content
where content::text like '%/media/baker-portrait.webp%'
   or content::text like '%/media/featured-scoopable-cookies.webp%';
