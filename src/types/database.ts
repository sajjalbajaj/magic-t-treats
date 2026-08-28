/**
 * Typed schema for the Supabase client.
 *
 * Hand-maintained to stay in lockstep with `supabase/migrations/*`. When a
 * migration changes a table, change the matching Row here in the same commit —
 * the whole point of this file is that a schema drift becomes a type error
 * rather than a runtime surprise.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

/** Insert shape: everything optional except the columns without a default. */
type Insertable<Row, Required extends keyof Row = never> = Partial<Row> & Pick<Row, Required>;

type TableDef<Row, Insert, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

// --- Enums -----------------------------------------------------------------
export type MediaType = "image" | "video";
export type EnquiryStatus = "new" | "contacted" | "converted" | "closed" | "spam";
export type OrderStatus =
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
export type FulfilmentType = "delivery" | "pickup";
export type PaymentStatus = "pending" | "partial" | "paid" | "refunded";
export type AdminRole = "owner" | "admin" | "staff";
export type MediaFolder =
  | "products"
  | "posts"
  | "festive"
  | "about"
  | "testimonials"
  | "branding";

// --- Rows ------------------------------------------------------------------
export type AdminUserRow = {
  user_id: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  sku: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  starting_price: number | null;
  price_label: string | null;
  highlight_tags: string[];
  /** Source Instagram post, when the treat was imported from one. */
  instagram_url: string | null;
  is_sugar_free: boolean;
  is_eggless: boolean;
  is_customizable: boolean;
  is_bestseller: boolean;
  is_seasonal: boolean;
  available_today: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductMediaRow = {
  id: string;
  product_id: string;
  type: MediaType;
  storage_path: string;
  media_url: string | null;
  thumbnail_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  available_from: string | null;
  available_until: string | null;
  featured: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CollectionProductRow = {
  collection_id: string;
  product_id: string;
  sort_order: number;
};

export type EnquiryRow = {
  id: string;
  product_id: string | null;
  product_sku: string | null;
  product_name: string | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  quantity: string | null;
  required_date: string | null;
  fulfilment_type: FulfilmentType | null;
  customization: string | null;
  message: string | null;
  source: string;
  status: EnquiryStatus;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  device_type: string | null;
  created_at: string;
  updated_at: string;
};

export type EnquiryEventRow = {
  id: string;
  product_id: string | null;
  product_sku: string | null;
  event_type: string;
  source: string | null;
  cta_location: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  device_type: string | null;
  created_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  enquiry_id: string | null;
  customer_name: string;
  phone: string | null;
  email: string | null;
  required_date: string | null;
  fulfilment_type: FulfilmentType | null;
  delivery_address: string | null;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  total_amount: number;
  advance_amount: number;
  payment_status: PaymentStatus;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  customization: string | null;
  created_at: string;
};

export type PostRow = {
  id: string;
  title: string | null;
  caption: string | null;
  type: MediaType;
  storage_path: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  instagram_url: string | null;
  show_on_homepage: boolean;
  published: boolean;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TestimonialRow = {
  id: string;
  customer_name: string;
  message: string;
  rating: number | null;
  source: string | null;
  screenshot_url: string | null;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteContentRow = {
  id: string;
  content_key: string;
  content: Json;
  updated_at: string;
};

export type SiteSettingRow = {
  id: string;
  setting_key: string;
  setting_value: Json;
  is_public: boolean;
  updated_at: string;
};

export type MediaAssetRow = {
  id: string;
  bucket: string;
  storage_path: string;
  public_url: string | null;
  folder: MediaFolder;
  type: MediaType;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminActivityLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
};

// --- Database --------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      admin_users: TableDef<AdminUserRow, Insertable<AdminUserRow, "user_id">>;
      categories: TableDef<CategoryRow, Insertable<CategoryRow, "name" | "slug">>;
      products: TableDef<ProductRow, Insertable<ProductRow, "sku" | "name" | "slug">>;
      product_media: TableDef<
        ProductMediaRow,
        Insertable<ProductMediaRow, "product_id" | "type" | "storage_path">
      >;
      collections: TableDef<CollectionRow, Insertable<CollectionRow, "name" | "slug">>;
      collection_products: TableDef<
        CollectionProductRow,
        Insertable<CollectionProductRow, "collection_id" | "product_id">
      >;
      enquiries: TableDef<EnquiryRow, Insertable<EnquiryRow>>;
      enquiry_events: TableDef<EnquiryEventRow, Insertable<EnquiryEventRow, "event_type">>;
      orders: TableDef<OrderRow, Insertable<OrderRow, "customer_name">>;
      order_items: TableDef<OrderItemRow, Insertable<OrderItemRow, "order_id">>;
      posts: TableDef<PostRow, Insertable<PostRow, "type">>;
      testimonials: TableDef<
        TestimonialRow,
        Insertable<TestimonialRow, "customer_name" | "message">
      >;
      site_content: TableDef<SiteContentRow, Insertable<SiteContentRow, "content_key">>;
      site_settings: TableDef<
        SiteSettingRow,
        Insertable<SiteSettingRow, "setting_key" | "setting_value">
      >;
      media_assets: TableDef<
        MediaAssetRow,
        Insertable<MediaAssetRow, "storage_path" | "type" | "file_name" | "mime_type">
      >;
      admin_activity_logs: TableDef<
        AdminActivityLogRow,
        Insertable<AdminActivityLogRow, "action">
      >;
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<never, never>; Returns: boolean };
      admin_role: { Args: Record<never, never>; Returns: string };
      admin_dashboard_kpis: { Args: Record<never, never>; Returns: Json };
      admin_most_enquired: {
        Args: { p_days?: number; p_limit?: number };
        Returns: { product_name: string; product_sku: string | null; enquiry_count: number }[];
      };
      admin_lead_sources: {
        Args: { p_days?: number };
        Returns: { source: string; lead_count: number; share: number }[];
      };
      admin_enquiry_funnel: { Args: { p_days?: number }; Returns: Json };
      admin_revenue_summary: {
        Args: { p_from?: string | null; p_to?: string | null };
        Returns: Json;
      };
      check_rate_limit: {
        Args: { p_bucket_key: string; p_max_hits: number; p_window_seconds: number };
        Returns: boolean;
      };
      media_asset_usage: {
        Args: { asset_url: string | null; asset_path: string };
        Returns: number;
      };
    };
    Enums: {
      media_type: MediaType;
      enquiry_status: EnquiryStatus;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
