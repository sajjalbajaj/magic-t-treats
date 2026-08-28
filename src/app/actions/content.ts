"use server";

import {
  actionError,
  describeDatabaseError,
  logActivity,
  revalidateAdmin,
  revalidatePublic,
  withAdmin,
} from "@/lib/admin/actions";
import { contentDefaults } from "@/config/content-defaults";
import { postSchema, testimonialSchema } from "@/lib/validation/admin";
import {
  fulfilmentSettingsSchema,
  generalSettingsSchema,
  seoSettingsSchema,
  socialSettingsSchema,
  uploadSettingsSchema,
} from "@/lib/validation/admin";
import type { ActionResult, SiteContentKey, SiteSettingKey } from "@/types/domain";
import type { Json } from "@/types/database";

type FormResult = ActionResult<{ id: string }>;

// --- Posts & reels ----------------------------------------------------------
export async function savePostAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  return withAdmin(async ({ supabase, user }) => {
    const parsed = postSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return actionError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      );
    }

    const { id, ...values } = parsed.data;

    if (!values.media_url) {
      return actionError("VALIDATION_ERROR", "Please choose an image or video for this post.");
    }

    // published_at is stamped the first time it goes live, and left alone
    // afterwards so republishing does not reorder the feed.
    const record = {
      ...values,
      published_at: values.published ? new Date().toISOString() : null,
    };

    let query;
    if (id) {
      const { data: existing } = await supabase
        .from("posts")
        .select("published_at")
        .eq("id", id)
        .maybeSingle();

      query = supabase
        .from("posts")
        .update({
          ...values,
          published_at: values.published
            ? (existing?.published_at ?? new Date().toISOString())
            : null,
        })
        .eq("id", id)
        .select("id")
        .single();
    } else {
      query = supabase.from("posts").insert(record).select("id").single();
    }

    const { data, error } = await query;

    if (error || !data) {
      return actionError("DB_ERROR", describeDatabaseError(error!, "post"));
    }

    await logActivity(user.id, id ? "post.update" : "post.create", "post", data.id, {
      title: values.title ?? null,
      published: values.published,
    });

    revalidateAdmin("/admin/posts");
    revalidatePublic("posts");
    return { success: true, data: { id: data.id } };
  });
}

export async function setPostPublishedAction(
  id: string,
  published: boolean,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase }) => {
    const { data: existing } = await supabase
      .from("posts")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("posts")
      .update({
        published,
        published_at: published
          ? (existing?.published_at ?? new Date().toISOString())
          : null,
      })
      .eq("id", id);

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "post"));

    revalidateAdmin("/admin/posts");
    revalidatePublic("posts");
    return { success: true, data: undefined };
  });
}

export async function deletePostAction(id: string): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "post"));

    await logActivity(user.id, "post.delete", "post", id);
    revalidateAdmin("/admin/posts");
    revalidatePublic("posts");
    return { success: true, data: undefined };
  });
}

// --- Testimonials -----------------------------------------------------------
export async function saveTestimonialAction(
  _prev: FormResult | null,
  formData: FormData,
): Promise<FormResult> {
  return withAdmin(async ({ supabase, user }) => {
    const parsed = testimonialSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return actionError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      );
    }

    const { id, ...values } = parsed.data;

    const { data, error } = id
      ? await supabase.from("testimonials").update(values).eq("id", id).select("id").single()
      : await supabase.from("testimonials").insert(values).select("id").single();

    if (error || !data) {
      return actionError("DB_ERROR", describeDatabaseError(error!, "testimonial"));
    }

    await logActivity(
      user.id,
      id ? "testimonial.update" : "testimonial.create",
      "testimonial",
      data.id,
      { customer: values.customer_name },
    );

    revalidateAdmin("/admin/testimonials");
    revalidatePublic("testimonials");
    return { success: true, data: { id: data.id } };
  });
}

export async function setTestimonialPublishedAction(
  id: string,
  published: boolean,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase }) => {
    const { error } = await supabase.from("testimonials").update({ published }).eq("id", id);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "testimonial"));

    revalidateAdmin("/admin/testimonials");
    revalidatePublic("testimonials");
    return { success: true, data: undefined };
  });
}

export async function deleteTestimonialAction(id: string): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "testimonial"));

    await logActivity(user.id, "testimonial.delete", "testimonial", id);
    revalidateAdmin("/admin/testimonials");
    revalidatePublic("testimonials");
    return { success: true, data: undefined };
  });
}

// --- Website copy -----------------------------------------------------------

/**
 * Saves one content block.
 *
 * The baker fills in ordinary labelled inputs; this reassembles them into the
 * JSON shape the block expects. Repeated inputs (badges, bullet lists, card
 * groups) arrive as multiple values under the same name and are rebuilt into
 * arrays here, so nobody ever edits raw JSON.
 */
export async function saveContentBlockAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const key = String(formData.get("content_key") ?? "") as SiteContentKey;

    if (!(key in contentDefaults)) {
      return actionError("VALIDATION_ERROR", "Unknown content block.");
    }

    const defaults = contentDefaults[key] as Record<string, unknown>;
    const content: Record<string, unknown> = {};

    for (const [field, fallback] of Object.entries(defaults)) {
      if (Array.isArray(fallback)) {
        const first = fallback[0];

        if (first && typeof first === "object") {
          // Array of {title, description} pairs — read as parallel arrays.
          const titles = formData.getAll(`${field}__title`).map(String);
          const descriptions = formData.getAll(`${field}__description`).map(String);

          content[field] = titles
            .map((title, index) => ({
              title: title.trim(),
              description: (descriptions[index] ?? "").trim(),
            }))
            .filter((item) => item.title.length > 0 || item.description.length > 0);
        } else {
          // Array of plain strings, submitted one per line.
          const raw = formData.get(field);
          content[field] =
            typeof raw === "string"
              ? raw
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line.length > 0)
              : fallback;
        }
        continue;
      }

      const raw = formData.get(field);
      if (raw === null) {
        content[field] = fallback;
        continue;
      }

      const value = String(raw).trim();
      // A cleared optional field (a removed photo) must persist as null, not "".
      content[field] = value.length > 0 ? value : fallback === null ? null : value;
    }

    const { error } = await supabase
      .from("site_content")
      .upsert({ content_key: key, content: content as Json }, { onConflict: "content_key" });

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "content"));

    await logActivity(user.id, "content.update", "site_content", key);

    revalidateAdmin("/admin/content");
    revalidatePublic("content");
    return { success: true, data: undefined };
  });
}

// --- Settings ---------------------------------------------------------------
const settingSchemas = {
  general: generalSettingsSchema,
  social: socialSettingsSchema,
  fulfilment: fulfilmentSettingsSchema,
  seo: seoSettingsSchema,
  uploads: uploadSettingsSchema,
} as const;

export async function saveSettingsAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin(async ({ supabase, user }) => {
    const key = String(formData.get("setting_key") ?? "") as SiteSettingKey;

    if (!(key in settingSchemas)) {
      return actionError("VALIDATION_ERROR", "Unknown settings group.");
    }

    const schema = settingSchemas[key];
    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));

    if (!parsed.success) {
      return actionError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      );
    }

    const { error } = await supabase.from("site_settings").upsert(
      {
        setting_key: key,
        setting_value: parsed.data as Json,
        // Upload limits are operational, not public content.
        is_public: key !== "uploads",
      },
      { onConflict: "setting_key" },
    );

    if (error) return actionError("DB_ERROR", describeDatabaseError(error, "settings"));

    await logActivity(user.id, "settings.update", "site_settings", key);

    revalidateAdmin("/admin/settings");
    revalidatePublic("all");
    return { success: true, data: undefined };
  });
}
