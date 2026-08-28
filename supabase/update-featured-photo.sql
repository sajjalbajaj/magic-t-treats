-- ---------------------------------------------------------------------------
-- Update the homepage feature photo's alt text.
--
-- Run this once in the Supabase SQL editor.
--
-- Why it is needed: the photo file itself was replaced in place, at the same
-- path, so the image on the live site changed the moment the site was
-- redeployed. The description of that photo, however, lives in the database
-- (site_content overrides the built-in defaults), so it still describes the old
-- three-cookie shot. That is the version screen readers and search engines get.
--
-- Safe to run more than once: it patches one key inside the existing JSON and
-- leaves every other field — heading, points, CTA — exactly as it is, including
-- any wording edited from the dashboard.
-- ---------------------------------------------------------------------------

update public.site_content
set
    value = value
        || jsonb_build_object(
            'imageAlt',
            'A spoon lifting a warm, gooey scoop from a tin of chocolate chip cookie, melted chocolate stretching away from it.'
        ),
    updated_at = now()
where key = 'home.featured';

-- Confirm it took.
select
    key,
    value ->> 'imageUrl' as image_url,
    value ->> 'imageAlt'  as image_alt
from public.site_content
where key = 'home.featured';
