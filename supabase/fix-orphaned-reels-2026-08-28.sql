-- ---------------------------------------------------------------------------
-- Remove two orphaned reel posts  ·  2026-08-28
--
-- Run this once in the Supabase SQL editor, after `add-photography-2026-08-28.sql`.
--
-- What happened: the two homepage reels were renamed for SEO,
--
--     reel-scoopable-cookies.mp4  ->  scoopable-cookies-baking-reel.mp4
--     reel-in-the-kitchen.mp4     ->  home-bakery-kitchen-reel.mp4
--
-- and the photography script inserted fresh posts under the new names. It did
-- not remove the original rows, because it only deletes rows matching the name
-- it is about to insert. The result is four video posts where there should be
-- two, and the two older ones point at files that no longer exist.
--
-- Visible symptom: the homepage slider runs six slides instead of four, and two
-- of them are videos that cannot load.
--
-- Deleting is correct rather than repointing: the replacement rows already
-- exist with the right paths, titles and sort order, so repointing these would
-- just create duplicates.
--
-- Safe to run more than once. Safe to run even if you never hit the problem,
-- in which case it deletes nothing.
-- ---------------------------------------------------------------------------

delete from public.posts
where media_url in (
    '/media/reel-scoopable-cookies.mp4',
    '/media/reel-in-the-kitchen.mp4'
);


-- ---------------------------------------------------------------------------
-- Check. Expect 6 posts, 4 of them on the homepage, and every media_url
-- pointing at a file that ships with the site.
-- ---------------------------------------------------------------------------

select
    count(*)                                        as posts_total,
    count(*) filter (where show_on_homepage)        as homepage_slides
from public.posts
where published;

select type, title, media_url, show_on_homepage
from public.posts
order by sort_order;
