-- ---------------------------------------------------------------------------
-- 0007 — Dashboard analytics
--
-- These aggregate in Postgres rather than in the application. The dashboard
-- must stay fast as enquiry/order volume grows, and pulling raw rows into a
-- serverless function to count them in JavaScript would not.
--
-- Every function is SECURITY DEFINER (it reads private tables) and therefore
-- opens with an explicit is_admin() gate.
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard_kpis()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    result jsonb;
    month_start date := date_trunc('month', now())::date;
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    select jsonb_build_object(
        'new_enquiries', (
            select count(*) from public.enquiries where status = 'new'
        ),
        'active_orders', (
            select count(*) from public.orders
             where status in ('confirmed', 'preparing', 'ready', 'out_for_delivery')
        ),
        'orders_due_today', (
            select count(*) from public.orders
             where required_date = current_date
               and status <> 'cancelled'
        ),
        'monthly_orders', (
            select count(*) from public.orders
             where created_at >= month_start
               and status <> 'cancelled'
        ),
        'monthly_revenue', (
            select coalesce(sum(total_amount), 0) from public.orders
             where created_at >= month_start
               and status <> 'cancelled'
        ),
        'conversion_rate', (
            -- Share of enquiries received this month that became orders.
            select case
                when count(*) = 0 then 0
                else round(
                    count(*) filter (where status = 'converted')::numeric * 100 / count(*), 1
                )
            end
            from public.enquiries
            where created_at >= month_start
        ),
        'active_products', (
            select count(*) from public.products where is_active
        ),
        'available_today', (
            select count(*) from public.products where is_active and available_today
        ),
        'published_posts', (
            select count(*) from public.posts where published
        )
    ) into result;

    return result;
end;
$$;

-- --- Most enquired products -------------------------------------------------
create or replace function public.admin_most_enquired(p_days integer default 30, p_limit integer default 8)
returns table (product_name text, product_sku text, enquiry_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    return query
    select coalesce(e.product_name, 'General enquiry') as product_name,
           e.product_sku,
           count(*) as enquiry_count
      from public.enquiries e
     where e.created_at >= now() - make_interval(days => p_days)
       and e.status <> 'spam'
     group by 1, 2
     order by enquiry_count desc
     limit p_limit;
end;
$$;

-- --- Lead sources -----------------------------------------------------------
-- utm_source is the signal; anything unlabelled is reported as Direct so the
-- percentages always add up to 100.
create or replace function public.admin_lead_sources(p_days integer default 30)
returns table (source text, lead_count bigint, share numeric)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    total bigint;
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    select count(*) into total
      from public.enquiries
     where created_at >= now() - make_interval(days => p_days)
       and status <> 'spam';

    if total = 0 then
        return;
    end if;

    return query
    select coalesce(nullif(lower(e.utm_source), ''), 'direct') as source,
           count(*) as lead_count,
           round(count(*)::numeric * 100 / total, 1) as share
      from public.enquiries e
     where e.created_at >= now() - make_interval(days => p_days)
       and e.status <> 'spam'
     group by 1
     order by lead_count desc;
end;
$$;

-- --- Enquiry funnel ---------------------------------------------------------
create or replace function public.admin_enquiry_funnel(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    since timestamptz := now() - make_interval(days => p_days);
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    return jsonb_build_object(
        'enquiry_clicks', (
            select count(*) from public.enquiry_events
             where event_type = 'product_enquiry_click' and created_at >= since
        ),
        'submitted', (
            select count(*) from public.enquiries
             where created_at >= since and status <> 'spam'
        ),
        'contacted', (
            select count(*) from public.enquiries
             where created_at >= since and status in ('contacted', 'converted')
        ),
        'converted', (
            select count(*) from public.enquiries
             where created_at >= since and status = 'converted'
        ),
        'delivered', (
            select count(*) from public.orders
             where created_at >= since and status = 'delivered'
        )
    );
end;
$$;

-- --- Revenue ----------------------------------------------------------------
create or replace function public.admin_revenue_summary(
    p_from date default null,
    p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    custom_total numeric;
begin
    if not public.is_admin() then
        raise exception 'not authorised' using errcode = '42501';
    end if;

    if p_from is not null and p_to is not null then
        select coalesce(sum(total_amount), 0) into custom_total
          from public.orders
         where status <> 'cancelled'
           and created_at::date between p_from and p_to;
    end if;

    return jsonb_build_object(
        'today', (
            select coalesce(sum(total_amount), 0) from public.orders
             where status <> 'cancelled' and created_at::date = current_date
        ),
        'this_week', (
            select coalesce(sum(total_amount), 0) from public.orders
             where status <> 'cancelled' and created_at >= date_trunc('week', now())
        ),
        'this_month', (
            select coalesce(sum(total_amount), 0) from public.orders
             where status <> 'cancelled' and created_at >= date_trunc('month', now())
        ),
        'outstanding', (
            select coalesce(sum(total_amount - advance_amount), 0) from public.orders
             where status <> 'cancelled' and payment_status <> 'paid'
        ),
        'custom', custom_total
    );
end;
$$;

-- Only signed-in users may call these; the is_admin() gate inside does the
-- real authorisation work.
revoke all on function public.admin_dashboard_kpis() from public;
revoke all on function public.admin_most_enquired(integer, integer) from public;
revoke all on function public.admin_lead_sources(integer) from public;
revoke all on function public.admin_enquiry_funnel(integer) from public;
revoke all on function public.admin_revenue_summary(date, date) from public;

grant execute on function public.admin_dashboard_kpis() to authenticated;
grant execute on function public.admin_most_enquired(integer, integer) to authenticated;
grant execute on function public.admin_lead_sources(integer) to authenticated;
grant execute on function public.admin_enquiry_funnel(integer) to authenticated;
grant execute on function public.admin_revenue_summary(date, date) to authenticated;
