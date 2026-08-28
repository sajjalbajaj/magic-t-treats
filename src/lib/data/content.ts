import "server-only";

import { cache } from "react";

import { contentDefaults, settingsDefaults } from "@/config/content-defaults";
import { buildInstagramMessageUrl } from "@/lib/enquiry/message";
import { safeQuery } from "@/lib/data/safe-query";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type {
  SiteContentKey,
  SiteContentMap,
  SiteSettingKey,
  SiteSettingsMap,
} from "@/types/domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Overlay stored values on top of the typed defaults.
 *
 * Shallow-merged on purpose: if the baker has only edited the hero heading, or
 * a newly added field is not yet present in the stored row, the default fills
 * the gap instead of rendering `undefined`. Null values are treated as "not
 * set" for the same reason — except where the default is itself null.
 */
function merge<T extends Record<string, unknown>>(defaults: T, stored: unknown): T {
  if (!isRecord(stored)) return defaults;

  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = stored[key as string];
    if (value === undefined) continue;
    if (value === null && defaults[key] !== null) continue;
    result[key] = value as T[keyof T];
  }
  return result;
}

/**
 * All content blocks for the current request, fetched in one round trip.
 * `cache()` dedupes it across the many components that read copy.
 */
export const getAllContent = cache(async (): Promise<SiteContentMap> => {
  return safeQuery("getAllContent", contentDefaults, async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("site_content").select("content_key, content");
    if (error) throw error;

    // Written through a loose record: indexing a mapped type by a union key
    // narrows the assignable value to the intersection of every block shape,
    // which no single block satisfies. The cast back is safe because `merge`
    // always returns the shape of the default it was given.
    const result: Record<string, unknown> = { ...contentDefaults };
    for (const row of data ?? []) {
      const key = row.content_key;
      if (!(key in contentDefaults)) continue;
      result[key] = merge(
        contentDefaults[key as SiteContentKey] as Record<string, unknown>,
        row.content,
      );
    }
    return result as SiteContentMap;
  });
});

export async function getContent<K extends SiteContentKey>(key: K): Promise<SiteContentMap[K]> {
  const all = await getAllContent();
  return all[key];
}

export const getAllSettings = cache(async (): Promise<SiteSettingsMap> => {
  return safeQuery("getAllSettings", settingsDefaults, async () => {
    const supabase = createPublicSupabaseClient();
    // Anon RLS exposes only rows flagged public; internal settings stay hidden.
    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_key, setting_value");
    if (error) throw error;

    const result: Record<string, unknown> = { ...settingsDefaults };
    for (const row of data ?? []) {
      const key = row.setting_key;
      if (!(key in settingsDefaults)) continue;
      result[key] = merge(
        settingsDefaults[key as SiteSettingKey] as Record<string, unknown>,
        row.setting_value,
      );
    }
    return result as SiteSettingsMap;
  });
});

export async function getSettings<K extends SiteSettingKey>(
  key: K,
): Promise<SiteSettingsMap[K]> {
  const all = await getAllSettings();
  return all[key];
}

/**
 * Resolved enquiry destinations.
 *
 * Database settings win over env vars: the baker can change the Instagram
 * handle from the dashboard without a redeploy. Env vars remain the fallback
 * so a fresh install still has somewhere to point.
 */
export const getSocialLinks = cache(async () => {
  const social = await getSettings("social");
  const envUsername = process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME ?? "";
  const envUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "";
  const envWhatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

  const instagramUsername = (social.instagramUsername || envUsername).replace(/^@+/, "");
  const instagramUrl =
    social.instagramUrl ||
    envUrl ||
    (instagramUsername ? `https://www.instagram.com/${instagramUsername}/` : "");
  const whatsappNumber = (social.whatsappNumber || envWhatsapp).replace(/\D/g, "");

  return {
    instagramUsername,
    /** Profile grid — "follow us" links. */
    instagramUrl,
    /** DM thread — where enquiries are handed off. */
    instagramMessageUrl: buildInstagramMessageUrl(instagramUsername, instagramUrl),
    whatsappNumber,
    whatsappUrl: whatsappNumber ? `https://wa.me/${whatsappNumber}` : "",
  };
});
