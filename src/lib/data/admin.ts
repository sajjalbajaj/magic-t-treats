import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type {
  Category,
  DashboardKpis,
  Enquiry,
  EnquiryFunnel,
  LeadSourceRow,
  MostEnquiredRow,
  Order,
  OrderItem,
  Post,
  Product,
  RevenueSummary,
  Testimonial,
} from "@/types/domain";
import type {
  CategoryRow,
  CollectionRow,
  MediaAssetRow,
  ProductMediaRow,
  ProductRow,
} from "@/types/database";

/**
 * Admin reads.
 *
 * Every function takes the caller's RLS-bound client rather than creating its
 * own. That is deliberate: it means an admin page physically cannot read data
 * with more privilege than the signed-in user has, and the is_admin() policies
 * remain the enforcement point rather than a formality.
 *
 * Lists are paginated server-side — enquiry and order tables grow without
 * bound, and "select everything then slice in JavaScript" stops working long
 * before the baker notices.
 */

export type Client = SupabaseClient<Database>;

export const PAGE_SIZE = 20;

export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
};

function range(page: number, size = PAGE_SIZE): [number, number] {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * size;
  return [from, from + size - 1];
}

function paginate<T>(rows: T[], total: number, page: number, size = PAGE_SIZE): Paginated<T> {
  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / size)),
  };
}

// --- Dashboard --------------------------------------------------------------
export async function getDashboardKpis(supabase: Client): Promise<DashboardKpis | null> {
  const { data, error } = await supabase.rpc("admin_dashboard_kpis");
  if (error) {
    console.error("[admin] KPI query failed:", error.message);
    return null;
  }
  return data as unknown as DashboardKpis;
}

export async function getMostEnquired(
  supabase: Client,
  days = 30,
  limit = 8,
): Promise<MostEnquiredRow[]> {
  const { data, error } = await supabase.rpc("admin_most_enquired", {
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    console.error("[admin] most-enquired query failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getLeadSources(supabase: Client, days = 30): Promise<LeadSourceRow[]> {
  const { data, error } = await supabase.rpc("admin_lead_sources", { p_days: days });
  if (error) {
    console.error("[admin] lead-source query failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getEnquiryFunnel(
  supabase: Client,
  days = 30,
): Promise<EnquiryFunnel | null> {
  const { data, error } = await supabase.rpc("admin_enquiry_funnel", { p_days: days });
  if (error) {
    console.error("[admin] funnel query failed:", error.message);
    return null;
  }
  return data as unknown as EnquiryFunnel;
}

export async function getRevenueSummary(
  supabase: Client,
  from?: string,
  to?: string,
): Promise<RevenueSummary | null> {
  const { data, error } = await supabase.rpc("admin_revenue_summary", {
    p_from: from ?? null,
    p_to: to ?? null,
  });
  if (error) {
    console.error("[admin] revenue query failed:", error.message);
    return null;
  }
  return data as unknown as RevenueSummary;
}

// --- Enquiries --------------------------------------------------------------
export async function getEnquiries(
  supabase: Client,
  options: { page?: number; status?: string; search?: string } = {},
): Promise<Paginated<Enquiry>> {
  const page = options.page ?? 1;
  const [from, to] = range(page);

  let query = supabase.from("enquiries").select("*", { count: "exact" });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status as Enquiry["status"]);
  }

  if (options.search) {
    // Escape PostgREST's or() delimiters so a comma or paren in the search box
    // cannot alter the filter expression.
    const term = options.search.replace(/[,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `customer_name.ilike.%${term}%,product_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[admin] enquiries query failed:", error.message);
    return paginate<Enquiry>([], 0, page);
  }

  return paginate(data ?? [], count ?? 0, page);
}

export async function getEnquiry(supabase: Client, id: string): Promise<Enquiry | null> {
  const { data, error } = await supabase.from("enquiries").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[admin] enquiry query failed:", error.message);
    return null;
  }
  return data;
}

export async function getRecentEnquiries(supabase: Client, limit = 6): Promise<Enquiry[]> {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

// --- Orders -----------------------------------------------------------------
export async function getOrders(
  supabase: Client,
  options: { page?: number; status?: string; search?: string } = {},
): Promise<Paginated<Order>> {
  const page = options.page ?? 1;
  const [from, to] = range(page);

  let query = supabase.from("orders").select("*", { count: "exact" });

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status as Order["status"]);
  }

  if (options.search) {
    const term = options.search.replace(/[,()]/g, " ").trim();
    if (term) {
      query = query.or(
        `customer_name.ilike.%${term}%,phone.ilike.%${term}%,order_number.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[admin] orders query failed:", error.message);
    return paginate<Order>([], 0, page);
  }

  return paginate(data ?? [], count ?? 0, page);
}

export async function getOrderWithItems(
  supabase: Client,
  id: string,
): Promise<(Order & { items: OrderItem[] }) | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items ( * )")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[admin] order query failed:", error.message);
    return null;
  }

  const row = data as unknown as Order & { order_items: OrderItem[] | null };
  return { ...row, items: row.order_items ?? [] };
}

export async function getOrdersDueToday(supabase: Client): Promise<Order[]> {
  const today = new Date();
  const iso = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("required_date", iso)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

// --- Catalogue --------------------------------------------------------------
const ADMIN_PRODUCT_SELECT = `
  *, category:categories ( id, name, slug ),
  media:product_media ( * )
` as const;

type AdminProductQueryRow = ProductRow & {
  category: Pick<CategoryRow, "id" | "name" | "slug"> | null;
  media: ProductMediaRow[] | null;
};

function normalise(row: AdminProductQueryRow): Product {
  const media = [...(row.media ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  return { ...row, category: row.category ?? null, media };
}

/** Admin sees archived products too — that is the point of archiving. */
export async function getAdminProducts(
  supabase: Client,
  options: { page?: number; search?: string; categoryId?: string; status?: string } = {},
): Promise<Paginated<Product>> {
  const page = options.page ?? 1;
  const [from, to] = range(page);

  let query = supabase.from("products").select(ADMIN_PRODUCT_SELECT, { count: "exact" });

  if (options.search) {
    const term = options.search.replace(/[,()]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  if (options.categoryId && options.categoryId !== "all") {
    query = query.eq("category_id", options.categoryId);
  }
  if (options.status === "active") query = query.eq("is_active", true);
  if (options.status === "archived") query = query.eq("is_active", false);

  const { data, error, count } = await query
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[admin] products query failed:", error.message);
    return paginate<Product>([], 0, page);
  }

  return paginate(
    ((data ?? []) as unknown as AdminProductQueryRow[]).map(normalise),
    count ?? 0,
    page,
  );
}

export async function getAdminProduct(supabase: Client, id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return normalise(data as unknown as AdminProductQueryRow);
}

/** Lightweight list for the Available Today toggles and order item pickers. */
export async function getProductOptions(supabase: Client) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, starting_price, available_today, is_active, category_id")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getAdminCategories(supabase: Client): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function getAdminCollections(
  supabase: Client,
): Promise<(CollectionRow & { productIds: string[] })[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_products ( product_id, sort_order )")
    .order("sort_order", { ascending: true });

  if (error) return [];

  type Row = CollectionRow & {
    collection_products: { product_id: string; sort_order: number }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    productIds: [...(row.collection_products ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((link) => link.product_id),
  }));
}

// --- Content ----------------------------------------------------------------
export async function getAdminPosts(supabase: Client): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getAdminTestimonials(supabase: Client): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getAdminMedia(
  supabase: Client,
  options: { page?: number; folder?: string } = {},
): Promise<Paginated<MediaAssetRow>> {
  const page = options.page ?? 1;
  const [from, to] = range(page, 24);

  let query = supabase.from("media_assets").select("*", { count: "exact" });
  if (options.folder && options.folder !== "all") {
    query = query.eq("folder", options.folder as MediaAssetRow["folder"]);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[admin] media query failed:", error.message);
    return paginate<MediaAssetRow>([], 0, page, 24);
  }

  return paginate(data ?? [], count ?? 0, page, 24);
}

/**
 * Raw content and settings rows for the editor.
 *
 * Unlike the public reader this does not merge defaults — the editor must show
 * exactly what is stored so the baker can see whether a field has been set.
 */
export async function getContentRows(supabase: Client) {
  const { data, error } = await supabase.from("site_content").select("content_key, content");
  if (error) return [];
  return data ?? [];
}

export async function getSettingRows(supabase: Client) {
  const { data, error } = await supabase
    .from("site_settings")
    .select("setting_key, setting_value, is_public");
  if (error) return [];
  return data ?? [];
}

export async function getActivityLog(supabase: Client, limit = 20) {
  const { data, error } = await supabase
    .from("admin_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}
