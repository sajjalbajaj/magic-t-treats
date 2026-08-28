-- ---------------------------------------------------------------------------
-- 0004 — Lead capture and order lifecycle
-- ---------------------------------------------------------------------------

do $$
begin
    if not exists (select 1 from pg_type where typname = 'enquiry_status') then
        create type enquiry_status as enum ('new', 'contacted', 'converted', 'closed', 'spam');
    end if;
    if not exists (select 1 from pg_type where typname = 'order_status') then
        create type order_status as enum (
            'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'
        );
    end if;
end
$$;

-- --- Enquiries -------------------------------------------------------------
create table if not exists public.enquiries (
    id uuid primary key default gen_random_uuid(),
    product_id uuid references public.products(id) on delete set null,
    -- SKU and name are denormalised on purpose: an enquiry is a historical
    -- record and must stay readable even if the product is later renamed.
    product_sku text,
    product_name text,
    customer_name text,
    phone text,
    email text,
    quantity text,
    required_date date,
    fulfilment_type text check (fulfilment_type in ('delivery', 'pickup')),
    customization text,
    message text,
    source text not null default 'website',
    status enquiry_status not null default 'new',
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    referrer text,
    device_type text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.enquiries is
    'Customer enquiries captured from the website before the Instagram/WhatsApp handoff. Private.';

drop trigger if exists set_enquiries_updated_at on public.enquiries;
create trigger set_enquiries_updated_at
    before update on public.enquiries
    for each row execute function public.set_updated_at();

create index if not exists idx_enquiries_status on public.enquiries (status);
create index if not exists idx_enquiries_created_at on public.enquiries (created_at desc);
create index if not exists idx_enquiries_product on public.enquiries (product_id);
create index if not exists idx_enquiries_utm_source on public.enquiries (utm_source);

-- --- Enquiry analytics events ----------------------------------------------
-- Intent signals (button clicks, product views) tracked separately from
-- submitted enquiries so the funnel has a top.
create table if not exists public.enquiry_events (
    id uuid primary key default gen_random_uuid(),
    product_id uuid references public.products(id) on delete set null,
    product_sku text,
    event_type text not null,
    source text,
    cta_location text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    referrer text,
    device_type text,
    created_at timestamptz not null default now()
);

create index if not exists idx_enquiry_events_type_created
    on public.enquiry_events (event_type, created_at desc);
create index if not exists idx_enquiry_events_product on public.enquiry_events (product_id);
create index if not exists idx_enquiry_events_created_at on public.enquiry_events (created_at desc);

-- --- Orders ----------------------------------------------------------------
create sequence if not exists public.order_number_seq;

-- Human-friendly, sortable, collision-free order numbers: MT-2026-0001.
create or replace function public.next_order_number()
returns text
language sql
volatile
as $$
    select 'MT-' || to_char(now(), 'YYYY') || '-' ||
           lpad(nextval('public.order_number_seq')::text, 4, '0');
$$;

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    order_number text unique not null default public.next_order_number(),
    enquiry_id uuid references public.enquiries(id) on delete set null,
    customer_name text not null,
    phone text,
    email text,
    required_date date,
    fulfilment_type text check (fulfilment_type in ('delivery', 'pickup')),
    delivery_address text,
    subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
    discount numeric(10, 2) not null default 0 check (discount >= 0),
    delivery_charge numeric(10, 2) not null default 0 check (delivery_charge >= 0),
    total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
    advance_amount numeric(10, 2) not null default 0 check (advance_amount >= 0),
    payment_status text not null default 'pending'
        check (payment_status in ('pending', 'partial', 'paid', 'refunded')),
    status order_status not null default 'confirmed',
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.orders is
    'Orders created internally by the baker after an enquiry is confirmed. Private.';

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
    before update on public.orders
    for each row execute function public.set_updated_at();

create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_required_date on public.orders (required_date);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_enquiry on public.orders (enquiry_id);

-- --- Order items -----------------------------------------------------------
create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    product_name text,
    product_sku text,
    quantity numeric(10, 2) not null default 1 check (quantity > 0),
    unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
    line_total numeric(10, 2) not null default 0 check (line_total >= 0),
    customization text,
    created_at timestamptz not null default now()
);

comment on table public.order_items is
    'Line items. Multi-product and combo orders are supported from V1.';

create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_product on public.order_items (product_id);
