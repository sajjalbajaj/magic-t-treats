-- ---------------------------------------------------------------------------
-- Diwali photography  ·  2026-08-28
--
-- Run this once in the Supabase SQL editor, after deploying the build that
-- contains the new files in `public/media/`.
--
-- Four festive shots, added as published posts. They appear in the gallery;
-- one is also flagged for the "From the Kitchen" strip on the homepage.
--
-- WHY NONE OF THESE ARE ATTACHED TO A PRODUCT
--
-- They show cookies, jars and chocolate slabs that cannot be matched to a
-- specific SKU by looking at them. Guessing would put the wrong photograph on
-- a product page, which is worse than the placeholder: a customer ordering the
-- Sugar-Free Dark Chocolate Slab should not be shown milk chocolate, and one
-- tin of cookies does not distinguish Ragi Choco Chip from Almond Butter.
-- The baker knows which is which; attach them from the dashboard, or say the
-- word and they can be wired here.
--
-- A NOTE ON THE PACKAGING LABELS
--
-- The printed label text in these frames is garbled, and on two of them it is
-- mirrored. It is illegible at the sizes the site renders, verified at 400px
-- (the real product-card width), where only the panda badge reads. They are
-- safe as cards and gallery tiles. Do not promote them to a full-width hero.
--
-- On alt text: only the DESCRIPTIVE half is stored. The house suffix
-- ("Magic T-treats, Magic t treats, Tashu, tavishi, Tavishi manohar") is added
-- by `lib/seo/alt-text.ts` at render time. For a post, the TITLE below is what
-- becomes both the caption and the alt, so it is written to read as both.
--
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

begin;

do $diwali$
declare
    item record;
begin
    for item in
        select * from (values
            ('Festive cookie hampers, tins and jars',
             'festive-cookie-gift-hamper-spread.webp', false, 7),
            ('Cookie tins and brownie boxes, ready for Diwali',
             'diwali-cookie-tins-and-brownie-boxes.webp', false, 8),
            ('Festive cookie jars, packed for gifting',
             'diwali-cookie-gift-jars.webp', true, 9),
            ('Handmade chocolate slabs, two to a pack',
             'handmade-chocolate-slabs-gift-packs.webp', false, 10)
        ) as t(title, file_name, on_homepage, position)
    loop
        delete from public.posts where media_url = '/media/' || item.file_name;

        insert into public.posts
            (title, type, storage_path, media_url,
             show_on_homepage, published, sort_order, published_at)
        values
            (item.title, 'image'::media_type,
             'media/' || item.file_name, '/media/' || item.file_name,
             item.on_homepage, true, item.position, now());
    end loop;
end
$diwali$;

commit;


-- ---------------------------------------------------------------------------
-- Check. Expect 10 published posts, 5 of them flagged for the homepage,
-- and the four new rows listed at the bottom.
-- ---------------------------------------------------------------------------

select
    count(*)                                 as published_posts,
    count(*) filter (where show_on_homepage) as homepage_flagged
from public.posts
where published;

select sort_order, type, title, media_url, show_on_homepage
from public.posts
order by sort_order;
