-- ---------------------------------------------------------------------------
-- Content update  ·  2026-08-28
--
-- Run this once in the Supabase SQL editor, top to bottom.
--
-- Why it is needed: the website copy lives in the database, not in the code.
-- The code only supplies defaults for keys the database does not have, so
-- edits made in the repo do not reach the live site on their own. This script
-- carries three changes across:
--
--   1. The homepage feature photo's description. The photo file itself was
--      replaced at the same path, so the picture already changed; only the
--      text describing it (used by screen readers and search engines) is stale.
--
--   2. The baker's story, rewritten and restructured. It used to be two fixed
--      fields, 'biography' and 'story'. It is now a list of paragraphs.
--
--      The stored row has no 'paragraphs' key yet, and the site falls back to
--      the built-in default for any key the database is missing, so the new
--      story already shows without this. What does NOT fall back is 'heading'
--      and 'signature': the database still holds the old wording for both, and
--      a stored value always wins. So until this runs, the About page reads the
--      new story under the old title "Meet the Baker".
--
--   3. Long dashes removed from stored copy: page text, product descriptions
--      and the SEO title.
--
-- Every statement is safe to run more than once.
-- ---------------------------------------------------------------------------

begin;

-- 1 --------------------------------------------------------------------------
-- Homepage feature photo description.

update public.site_content
set
    content = content || jsonb_build_object(
        'imageAlt',
        'A spoon lifting a warm, gooey scoop from a tin of chocolate chip cookie, melted chocolate stretching away from it.'
    ),
    updated_at = now()
where content_key = 'home.featured';


-- 2 --------------------------------------------------------------------------
-- The baker's story.
--
-- `- 'biography' - 'story'` drops the two retired keys, so nothing is left
-- behind for a future reader to mistake for live copy. The photo and its
-- description are deliberately untouched.

update public.site_content
set
    content = (content - 'biography' - 'story')
        || jsonb_build_object(
            'heading', 'Meet the Heart Behind Magic T Treats',
            'signature', 'Made with memories. Made with love. Made with a little magic.',
            'paragraphs', jsonb_build_array(
                'For her, food has always been more than something made in the kitchen. It has been a way of bringing people closer, creating small moments of happiness, and turning ordinary days into memories worth keeping.',
                'Some of her fondest memories began with cooking for the people around her and watching their faces light up after the very first bite. That feeling of making someone happy through food slowly became something deeply meaningful to her.',
                'A big part of that love came from home.',
                'Growing up, she watched her mother bake cakes and prepare treats for the family. The warmth of the kitchen, the aroma of something baking in the oven, and the excitement of everyone waiting to taste it stayed with her. Years later, she found herself doing the same thing, only this time with her own ideas, her own flavours, and her own little style.',
                'What started as curiosity slowly turned into creativity.',
                'She began experimenting with recipes, adding her personal touch, making treats healthier where possible, playing with chocolates, cookies, brownies, cakes and gifting combinations, and creating something that felt uniquely hers.',
                'And somewhere between all the experimenting, tasting, laughter and a little Panda Chef inspiration, Magic T Treats was born.',
                'The name has its own little mystery too.',
                'The T in Magic T Treats represents a secret ingredient. It is something that remains part of the magic behind every recipe. Maybe it is an ingredient. Maybe it is a feeling. Maybe it is simply the love and thought that goes into making every batch special.',
                'That secret is staying in the kitchen.',
                'For the last five years, she has been serving customers with handmade baked treats created with care, patience and a genuine love for what she does.',
                'Every cookie, brownie, chocolate, cake and gift box carries a little part of that journey. From watching her mother bake, to finding her own style, to seeing customers come back for another box, every step has made Magic T Treats what it is today.',
                'For her, the most rewarding part is still the simplest one.',
                'Seeing someone take a bite, smile, and enjoy something she created.',
                'Because Magic T Treats was never just about baking.',
                'It is about sharing happiness, one treat at a time.'
            )
        ),
    updated_at = now()
where content_key = 'about.story';


-- 3 --------------------------------------------------------------------------
-- Remove long dashes from stored copy.
--
-- Done as a loop over exact before/after sentences rather than a blanket
-- replace of the dash character. A blanket replace would leave "indulgent
-- baked in a tin" with no punctuation at all; each sentence needs its own
-- rewrite, and listing them makes the change reviewable.
--
-- The `where ... like` guards mean a second run touches nothing.

do $rewrite$
declare
    pair record;
begin
    for pair in
        select * from (values
            ('Finger millet and dark chocolate — the wholesome cookie children actually finish.',
             'Finger millet and dark chocolate. The wholesome cookie children actually finish.'),
            ('No refined sugar at all — the sweetness comes entirely from Medjool dates.',
             'No refined sugar at all. The sweetness comes entirely from Medjool dates.'),
            ('Hearts, stars, letters, logos — moulded to your occasion.',
             'Hearts, stars, letters and logos, moulded to your occasion.'),
            ('Just dates, nuts and seeds — nothing added, nothing refined.',
             'Just dates, nuts and seeds. Nothing added, nothing refined.'),
            ('Our rotating festive box — the assortment is built fresh for each occasion',
             'Our rotating festive box. The assortment is built fresh for each occasion'),
            ('Sugar-free, eggless or custom-shaped — tell us what you need.',
             'Sugar-free, eggless or custom-shaped. Tell us what you need.'),
            ('Big, gooey and unapologetically indulgent — baked in a tin',
             'Big, gooey and unapologetically indulgent, baked in a tin'),
            ('Sugar-free and eggless are not afterthoughts here — they are half of what we bake.',
             'Sugar-free and eggless are not afterthoughts here. They are half of what we bake.'),
            ('Magic T-treats — Home Bakery in Tricity',
             'Magic T-treats | Home Bakery in Tricity')
        ) as t(before_text, after_text)
    loop
        update public.site_content
        set content = replace(content::text, pair.before_text, pair.after_text)::jsonb,
            updated_at = now()
        where content::text like '%' || pair.before_text || '%';

        update public.site_settings
        set setting_value = replace(setting_value::text, pair.before_text, pair.after_text)::jsonb,
            updated_at = now()
        where setting_value::text like '%' || pair.before_text || '%';

        update public.products
        set description = replace(description, pair.before_text, pair.after_text),
            updated_at = now()
        where description like '%' || pair.before_text || '%';

        update public.products
        set short_description = replace(short_description, pair.before_text, pair.after_text),
            updated_at = now()
        where short_description like '%' || pair.before_text || '%';
    end loop;
end
$rewrite$;

commit;


-- ---------------------------------------------------------------------------
-- Check it worked.
--
-- Expect the first query to report 16 paragraphs and the new heading, and the
-- second to return no rows at all (nothing left holding a long dash).
-- ---------------------------------------------------------------------------

select
    jsonb_array_length(content -> 'paragraphs') as story_paragraphs,
    content ->> 'heading'   as story_heading,
    content ->> 'signature' as story_signature
from public.site_content
where content_key = 'about.story';

select 'site_content' as source, content_key as identifier
from public.site_content
where content::text like '%' || chr(8212) || '%'
union all
select 'site_settings', setting_key
from public.site_settings
where setting_value::text like '%' || chr(8212) || '%'
union all
select 'product', name
from public.products
where coalesce(description, '') || coalesce(short_description, '') like '%' || chr(8212) || '%';
