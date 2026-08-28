-- ============================================================================
-- Magic T-treats — FIX-UP script
--
-- Run this if the main setup stopped partway (tables exist, but the site
-- cannot see them, or there are no products, or the media bucket is missing).
--
-- Contains only the parts that were missed:
--   1. Role privileges  — makes the tables visible to the website
--   2. instagram_url     — a newer column on products
--   3. Seed data         — categories, products, collections, website copy
--   4. Storage bucket    — failure-tolerant, so it cannot abort the rest
--
-- Safe to run more than once.
-- ============================================================================

-- ---------- 1. Role privileges ----------

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

-- ---------- 2. instagram_url column ----------

-- ---------------------------------------------------------------------------
-- 0010 — Instagram-sourced products
--
-- Treats are often announced on Instagram first. Recording the source post
-- lets the public card link back to it, and lets the enquiry message name the
-- exact post the customer is asking about — which is the difference between
-- "I want the cookies" and a message the baker can act on immediately.
-- ---------------------------------------------------------------------------

alter table public.products
    add column if not exists instagram_url text;

comment on column public.products.instagram_url is
    'Source Instagram post for this treat, if it was imported from one.';

-- Partial index: only a minority of products come from a post, and this is
-- used to spot duplicates before importing the same URL twice.
create index if not exists idx_products_instagram_url
    on public.products (instagram_url)
    where instagram_url is not null;

-- ---------- 3. Seed data ----------

-- ---------------------------------------------------------------------------
-- Magic T-treats — seed data
--
-- Safe to run repeatedly: every statement is upsert-shaped.
--
-- Deliberately contains NO customer data. Enquiries and orders are left empty
-- so the dashboard's first numbers are real ones, and so no invented personal
-- data ever reaches a production database.
--
-- Media URLs are left null: the baker uploads real photography through the
-- Media Library, and the UI renders proper empty states until then.
-- ---------------------------------------------------------------------------

-- === Categories ============================================================
insert into public.categories (name, slug, description, sort_order, is_active) values
    ('Cookies',    'cookies',    'Slow-baked, wholesome and never too sweet.',            1, true),
    ('Dry Cakes',  'dry-cakes',  'Tea-time loaves baked in small batches.',               2, true),
    ('Brownies',   'brownies',   'Dense, fudgy and unapologetically chocolatey.',         3, true),
    ('Choco Bites','choco-bites','Bite-sized indulgence, handmade one tray at a time.',   4, true),
    ('Chocolates', 'chocolates', 'Hand-moulded chocolates in a range of shapes.',         5, true),
    ('Muffins',    'muffins',    'Soft, freshly baked and best eaten warm.',              6, true),
    ('Sugar-Free', 'sugar-free', 'All of the treat, none of the refined sugar.',          7, true),
    ('Gift Boxes', 'gift-boxes', 'Thoughtfully curated boxes for every occasion.',        8, true)
on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order;

-- === Products ==============================================================
insert into public.products (
    sku, category_id, name, slug, short_description, description,
    starting_price, price_label, highlight_tags,
    is_sugar_free, is_eggless, is_customizable, is_bestseller, is_seasonal,
    available_today, is_active, sort_order
)
select v.sku,
       c.id,
       v.name, v.slug, v.short_description, v.description,
       v.starting_price, v.price_label, v.highlight_tags,
       v.is_sugar_free, v.is_eggless, v.is_customizable, v.is_bestseller, v.is_seasonal,
       v.available_today, true, v.sort_order
from (values
    ('CK-001', 'cookies', 'Oats & Jaggery Cookies',
     'oats-jaggery-cookies',
     'Rolled oats, jaggery and cold-pressed ghee. Crisp at the edge, chewy in the middle.',
     'Our everyday favourite. Made with rolled oats, unrefined jaggery and cold-pressed ghee, these cookies are baked low and slow so they keep their crunch for days. No refined sugar, no palm oil, no preservatives.',
     320.00, 'per 250g box', array['Handmade'], false, true, false, true, false, true, 1),

    ('CK-002', 'cookies', 'Almond Butter Cookies',
     'almond-butter-cookies',
     'Stone-ground almond butter folded through a short, buttery dough.',
     'Stone-ground almond butter gives these a deep, nutty richness that you simply cannot get from almond flour alone. Finished with a whole roasted almond on top.',
     380.00, 'per 250g box', array['Handmade'], false, false, false, false, false, false, 2),

    ('CK-003', 'cookies', 'Ragi Choco Chip Cookies',
     'ragi-choco-chip-cookies',
     'Finger millet and dark chocolate. The wholesome cookie children actually finish.',
     'Finger millet (ragi) brings an earthy, malty depth that pairs beautifully with 55% dark chocolate chips. A genuinely nourishing cookie that does not taste like a compromise.',
     340.00, 'per 250g box', array['Limited Batch'], false, true, false, true, false, true, 3),

    ('DC-001', 'dry-cakes', 'Whole Wheat Banana Loaf',
     'whole-wheat-banana-loaf',
     'Overripe bananas, whole wheat and walnuts. Nothing else.',
     'Baked with fully ripened bananas so it needs very little added sweetness. Whole wheat flour keeps it hearty, and toasted walnuts run right through the loaf.',
     450.00, 'per loaf', array['Handmade'], false, true, false, true, false, false, 4),

    ('DC-002', 'dry-cakes', 'Orange & Almond Tea Cake',
     'orange-almond-tea-cake',
     'Fresh orange zest, ground almonds and a whisper of cardamom.',
     'A fragrant, moist tea cake built on ground almonds and the zest of whole oranges. Light enough for breakfast, elegant enough to gift.',
     520.00, 'per loaf', array[]::text[], false, false, true, false, false, false, 5),

    ('BR-001', 'brownies', 'Classic Fudge Brownies',
     'classic-fudge-brownies',
     'Dense, glossy-topped and properly fudgy. Our most-ordered treat.',
     'Made with couverture chocolate and cocoa for a double hit of depth. Baked deliberately underdone in the centre so the middle stays molten-soft. Sold as a tray of nine.',
     480.00, 'per tray of 9', array['Handmade'], false, false, true, true, false, true, 6),

    ('BR-002', 'brownies', 'Walnut Brownie Squares',
     'walnut-brownie-squares',
     'The classic, loaded with toasted walnuts.',
     'Everything the classic fudge brownie is, with generously toasted walnuts folded through and scattered on top.',
     540.00, 'per tray of 9', array[]::text[], false, false, true, false, false, false, 7),

    ('CB-001', 'choco-bites', 'Signature Choco Bites',
     'signature-choco-bites',
     'Two-bite rounds of dark chocolate, dates and roasted nuts.',
     'No refined sugar at all. The sweetness comes entirely from Medjool dates. Rolled by hand, coated in 62% dark chocolate and finished with a dusting of cocoa.',
     420.00, 'per box of 12', array['Handmade', 'Limited Batch'], true, true, true, true, false, true, 8),

    ('CB-002', 'choco-bites', 'Coconut Chocolate Bites',
     'coconut-chocolate-bites',
     'Desiccated coconut and dark chocolate, rolled small.',
     'Chewy coconut centres enrobed in dark chocolate. Naturally eggless and a reliable crowd-pleaser in gift boxes.',
     400.00, 'per box of 12', array[]::text[], false, true, true, false, false, false, 9),

    ('CH-001', 'chocolates', 'Handmade Assorted Chocolates',
     'handmade-assorted-chocolates',
     'A mixed box of hand-moulded chocolates in assorted shapes.',
     'Hand-tempered and hand-moulded in small batches. The assortment rotates with the season and can be tailored to your preferred fillings.',
     550.00, 'per box of 16', array['Handmade'], false, true, true, true, false, false, 10),

    ('CH-002', 'chocolates', 'Custom Shape Chocolates',
     'custom-shape-chocolates',
     'Hearts, stars, letters and logos, moulded to your occasion.',
     'Tell us the occasion and we will mould to match: hearts for anniversaries, alphabets for a name, or your company logo for corporate gifting. Minimum order applies.',
     600.00, 'starting, per box', array['Handmade'], false, true, true, false, false, false, 11),

    ('MF-001', 'muffins', 'Double Chocolate Muffins',
     'double-chocolate-muffins',
     'Cocoa batter, chocolate chunks, domed tops.',
     'A proper bakery-style muffin: high domed top, tender crumb and chunks of dark chocolate that stay soft even once cooled.',
     360.00, 'per box of 6', array[]::text[], false, false, false, false, false, true, 12),

    ('MF-002', 'muffins', 'Banana Walnut Muffins',
     'banana-walnut-muffins',
     'Everyday muffins with real banana and toasted walnut.',
     'Lightly sweetened with jaggery and built on real mashed banana. A lunchbox staple.',
     340.00, 'per box of 6', array[]::text[], false, true, false, false, false, false, 13),

    ('SF-001', 'sugar-free', 'Sugar-Free Date & Nut Bars',
     'sugar-free-date-nut-bars',
     'Dates, almonds, cashews and seeds. No added sugar whatsoever.',
     'Pressed, not baked. Just dates, nuts and seeds. Nothing added, nothing refined. A favourite with customers managing their sugar intake.',
     460.00, 'per box of 10', array['Handmade'], true, true, false, true, false, true, 14),

    ('SF-002', 'sugar-free', 'Sugar-Free Dark Chocolate Slab',
     'sugar-free-dark-chocolate-slab',
     'Stevia-sweetened dark chocolate, hand-poured and topped with nuts.',
     'Hand-poured in small batches using a stevia-sweetened dark couverture, then topped with almonds and pistachios.',
     490.00, 'per 200g slab', array[]::text[], true, true, true, false, false, false, 15),

    ('GB-001', 'gift-boxes', 'Signature Gift Box',
     'signature-gift-box',
     'A curated selection of our most-loved treats in one box.',
     'The easiest way to gift. A hand-packed assortment of cookies, choco bites and chocolates, finished with ribbon and a handwritten note card. Contents can be customised.',
     1200.00, 'starting', array['Handmade'], false, false, true, true, false, false, 16),

    ('GB-002', 'gift-boxes', 'Corporate Gifting Hamper',
     'corporate-gifting-hamper',
     'Bulk-friendly hampers with optional branded packaging.',
     'Built for teams and clients. Choose the contents, add your logo to the sleeve, and we will handle packing and coordinated delivery across Tricity. Bulk pricing on request.',
     1500.00, 'starting, bulk pricing', array[]::text[], false, false, true, false, false, false, 17),

    ('GB-003', 'gift-boxes', 'Festive Celebration Box',
     'festive-celebration-box',
     'A seasonal box that changes with the festival.',
     'Our rotating festive box. The assortment is built fresh for each occasion, from Rakhi through to New Year. Packaging is matched to the festival.',
     1400.00, 'starting', array['Limited Batch'], false, false, true, false, true, false, 18)
) as v(sku, category_slug, name, slug, short_description, description,
       starting_price, price_label, highlight_tags,
       is_sugar_free, is_eggless, is_customizable, is_bestseller, is_seasonal,
       available_today, sort_order)
join public.categories c on c.slug = v.category_slug
on conflict (sku) do update
    set name = excluded.name,
        category_id = excluded.category_id,
        short_description = excluded.short_description,
        description = excluded.description,
        starting_price = excluded.starting_price,
        price_label = excluded.price_label,
        sort_order = excluded.sort_order;

-- === Festive collections ===================================================
insert into public.collections (name, slug, description, featured, active, sort_order) values
    ('Raksha Bandhan', 'raksha-bandhan',
     'Chocolate and treat boxes made for sending across the miles.', true, true, 1),
    ('Diwali Gifting', 'diwali-gifting',
     'Festive hampers for family, neighbours and colleagues.', true, true, 2),
    ('Corporate Gifts', 'corporate-gifts',
     'Bulk hampers with optional branded packaging for teams and clients.', false, true, 3),
    ('Christmas & New Year', 'christmas-new-year',
     'Seasonal bakes and hand-moulded chocolates for the year end.', false, true, 4)
on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        featured = excluded.featured,
        sort_order = excluded.sort_order;

insert into public.collection_products (collection_id, product_id, sort_order)
select c.id, p.id, v.sort_order
from (values
    ('raksha-bandhan',     'CH-001', 1),
    ('raksha-bandhan',     'GB-001', 2),
    ('raksha-bandhan',     'CB-001', 3),
    ('diwali-gifting',     'GB-003', 1),
    ('diwali-gifting',     'CH-001', 2),
    ('diwali-gifting',     'SF-001', 3),
    ('corporate-gifts',    'GB-002', 1),
    ('corporate-gifts',    'CH-002', 2),
    ('christmas-new-year', 'GB-003', 1),
    ('christmas-new-year', 'BR-001', 2)
) as v(collection_slug, sku, sort_order)
join public.collections c on c.slug = v.collection_slug
join public.products p on p.sku = v.sku
on conflict (collection_id, product_id) do update
    set sort_order = excluded.sort_order;

-- === Testimonials ==========================================================
-- Illustrative starter copy so the section is not empty on first run. The
-- baker replaces these with real customer words from the dashboard.
insert into public.testimonials (customer_name, message, rating, source, published, sort_order) values
    ('Priya S.',
     'Ordered the sugar-free date bars for my father and he finished the box in two days. Finally something I can give him without worrying.',
     5, 'Instagram', true, 1),
    ('Ankit & Meera',
     'We ordered eighty gift boxes for our wedding favours. Packed beautifully, delivered on time across three addresses in Mohali. Guests are still asking where they were from.',
     5, 'WhatsApp', true, 2),
    ('Ritu K.',
     'The brownies are genuinely the best I have had in Chandigarh, and I have tried a lot of them. Fudgy the whole way through.',
     5, 'Instagram', true, 3)
on conflict do nothing;

-- === Starter reels =========================================================
-- The two bundled videos, registered as real posts so they are manageable
-- from the dashboard. The app also falls back to these files when the table
-- is empty, so the section works before this seed is ever run.
insert into public.posts (title, caption, type, media_url, show_on_homepage, published, sort_order, published_at)
values
    ('Scoopable cookies, fresh from the tin',
     'Big, gooey and best eaten warm.',
     'video', '/media/scoopable-cookies-baking-reel.mp4', true, true, 1, now()),
    ('A batch coming together',
     'Small batches, mixed and packed by hand.',
     'video', '/media/home-bakery-kitchen-reel.mp4', true, true, 2, now())
on conflict do nothing;

-- === Website copy ==========================================================
insert into public.site_content (content_key, content) values
('home.hero', jsonb_build_object(
    'heading', 'Freshly Baked. Thoughtfully Made.',
    'description', 'Healthy homemade treats, handcrafted chocolates and thoughtful gift boxes prepared in small batches for everyday cravings, celebrations and gifting.',
    'primaryButton', 'Explore Treats',
    'secondaryButton', 'Enquire on Instagram',
    'badges', jsonb_build_array('Homemade', 'Custom Orders', 'Sugar-Free Options', 'Tricity Delivery', 'Pickup Available'),
    'mediaType', 'image',
    'mediaUrl', null
)),
('home.trust', jsonb_build_object(
    'heading', 'Why people keep coming back',
    'items', jsonb_build_array(
        jsonb_build_object('title', 'Baked to order', 'description', 'Nothing sits on a shelf. Every batch is baked after your order is confirmed.'),
        jsonb_build_object('title', 'Honest ingredients', 'description', 'Jaggery, whole grains and cold-pressed ghee. No preservatives, no palm oil.'),
        jsonb_build_object('title', 'Made by one pair of hands', 'description', 'A home kitchen, not a factory line. Every box is packed personally.'),
        jsonb_build_object('title', 'Built around your occasion', 'description', 'Sugar-free, eggless or custom-shaped. Tell us what you need.')
    )
)),
('home.available_today', jsonb_build_object(
    'heading', 'Baking Today',
    'description', 'Ready from the kitchen right now, while stocks last.',
    'note', 'Limited batches available'
)),
('home.featured', jsonb_build_object(
    'eyebrow', 'This season',
    'heading', 'The Viral Scoopable Cookies',
    'description', 'Big, gooey and unapologetically indulgent, baked in a tin and meant to be scooped warm, straight from the box. Made to order in four flavours.',
    'points', jsonb_build_array(
        'Classic, Rich Chocolate, Nutella or Half & Half',
        'Baked fresh the day it reaches you',
        'Gift-ready tins, perfect for festivals and celebrations'
    ),
    'ctaLabel', 'Order Scoopable Cookies',
    'note', 'Please order a day in advance',
    'imageUrl', '/media/viral-scoopable-cookies-molten-chocolate.webp',
    'imageAlt', 'A spoon lifting a warm, gooey scoop from a tin of chocolate chip cookie, melted chocolate stretching away from it.'
)),
('home.bestsellers', jsonb_build_object(
    'heading', 'Most Loved Treats',
    'description', 'The ones our customers order again and again.'
)),
('home.custom_orders', jsonb_build_object(
    'heading', 'Made For Your Occasion',
    'description', 'Birthdays, weddings, corporate hampers or a box put together exactly the way you want it. Tell us the occasion and we will build around it.',
    'bullets', jsonb_build_array(
        'Custom shapes, flavours and fillings',
        'Sugar-free and eggless options across the menu',
        'Personalised packaging, notes and branding',
        'Bulk orders for celebrations and corporate gifting'
    ),
    'ctaLabel', 'Start a Custom Order'
)),
('home.testimonials', jsonb_build_object(
    'heading', 'Kind Words',
    'description', 'From the people who order again.'
)),
('home.instagram', jsonb_build_object(
    'heading', 'From the Kitchen',
    'description', 'Fresh bakes, behind the scenes and what is coming next.'
)),
('home.delivery', jsonb_build_object(
    'heading', 'Delivery & Pickup',
    'description', 'Wherever you are in Tricity, we will get your box to you.',
    'cards', jsonb_build_array(
        jsonb_build_object('title', 'Tricity Delivery', 'description', 'Delivery available across Chandigarh, Mohali and Panchkula. Charges are confirmed when you order.'),
        jsonb_build_object('title', 'Pickup', 'description', 'Prefer to collect? Pickup is available by appointment once your order is ready.'),
        jsonb_build_object('title', 'Bulk & Gifting', 'description', 'Advance orders for celebrations, wedding favours and corporate gifting. Please allow lead time.')
    )
)),
('home.final_cta', jsonb_build_object(
    'heading', 'Something to celebrate?',
    'description', 'Send us a message with the occasion and the date. We will take it from there.',
    'primaryButton', 'Enquire Now'
)),
('about.story', jsonb_build_object(
    'heading', 'Meet the Heart Behind Magic T Treats',
    'bakerName', 'The baker behind Magic T-treats',
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
    ),
    'signature', 'Made with memories. Made with love. Made with a little magic.',
    'photoUrl', '/media/tavishi-manohar-home-baker-tricity.webp',
    'photoAlt', 'The baker behind Magic T-treats, in a chef''s hat and apron, holding a plate of handmade chocolate truffles.'
)),
('about.philosophy', jsonb_build_object(
    'heading', 'How we bake',
    'values', jsonb_build_array(
        jsonb_build_object('title', 'Small batches, always', 'description', 'Volume is capped on purpose. Quality is easier to hold when the tray is small.'),
        jsonb_build_object('title', 'Ingredients you can name', 'description', 'Whole grains, jaggery, real butter and couverture chocolate. Nothing that needs explaining.'),
        jsonb_build_object('title', 'Made for real diets', 'description', 'Sugar-free and eggless are not afterthoughts here. They are half of what we bake.'),
        jsonb_build_object('title', 'Packed like a gift', 'description', 'Every box is packed by hand, because most of them are going to someone who matters.')
    )
)),
('footer.content', jsonb_build_object(
    'tagline', 'Small-batch bakes, handmade chocolates and thoughtful gifting across Tricity.',
    'note', 'Baked fresh to order in a home kitchen.'
))
on conflict (content_key) do nothing;

-- === Settings ==============================================================
insert into public.site_settings (setting_key, setting_value, is_public) values
('general', jsonb_build_object(
    'bakeryName', 'Magic T-treats',
    'tagline', 'Homemade Chocolates and Cakes',
    'phone', '',
    'email', '',
    'serviceArea', 'Chandigarh, Mohali & Panchkula',
    'logoUrl', '/brand/logo.png',
    'faviconUrl', null
), true),
('social', jsonb_build_object(
    'instagramUrl', 'https://www.instagram.com/magicttreats_/',
    'instagramUsername', 'magicttreats_',
    'whatsappNumber', ''
), true),
('fulfilment', jsonb_build_object(
    'deliveryText', 'Delivery available across Chandigarh, Mohali and Panchkula.',
    'pickupText', 'Pickup available by appointment once your order is ready.',
    'serviceAreas', jsonb_build_array('Chandigarh', 'Mohali', 'Panchkula', 'Zirakpur')
), true),
('seo', jsonb_build_object(
    'defaultTitle', 'Magic T-treats | Home Bakery in Tricity',
    'defaultDescription', 'Healthy homemade cookies, brownies, handmade chocolates and festive gift boxes, baked in small batches and delivered across Chandigarh, Mohali and Panchkula.',
    'ogImageUrl', '/brand/og.png',
    'keywords', jsonb_build_array(
        'homemade bakery Tricity', 'healthy cookies Chandigarh', 'brownies Chandigarh',
        'handmade chocolates Chandigarh', 'sugar-free bakery Tricity',
        'custom chocolate gifts Chandigarh', 'festive gift boxes',
        'home bakery Panchkula', 'bakery Mohali'
    )
), true),
('uploads', jsonb_build_object(
    'maxImageMb', 10,
    'maxVideoMb', 100
), false)
on conflict (setting_key) do nothing;

-- ---------- 4. Storage ----------

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
