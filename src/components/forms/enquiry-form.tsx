"use client";

import { useMemo, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/ui/brand-icons";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { MediaFrame } from "@/components/ui/media-frame";
import { RollingBite } from "@/components/ui/loaders";
import { buildEnquiryHandoffUrl, buildProductEnquiryMessage } from "@/lib/enquiry/message";
import { copyToClipboard } from "@/lib/clipboard";
import { readAttribution, trackEvent } from "@/lib/analytics/track-event";
import { getProductPoster } from "@/lib/products/display";
import { todayIso } from "@/lib/utils";
import type { Product } from "@/types/domain";
import type { SocialLinks } from "@/components/product/product-dialogs";

type FormState = {
  customerName: string;
  phone: string;
  quantity: string;
  requiredDate: string;
  fulfilmentType: "" | "delivery" | "pickup";
  customization: string;
  message: string;
};

const initialState: FormState = {
  customerName: "",
  phone: "",
  quantity: "",
  requiredDate: "",
  fulfilmentType: "",
  customization: "",
  message: "",
};

/**
 * Product enquiry form.
 *
 * The handoff is the delicate part. Three browser behaviours constrain the
 * order of operations:
 *   - a popup must be opened synchronously inside the click, or it is blocked;
 *   - the clipboard must be written inside the same gesture in Safari;
 *   - the enquiry must still be recorded even if the customer never sends the
 *     message, because that is the lead the baker follows up.
 *
 * So: open the tab and copy first, then persist, then point the tab at the
 * destination. If anything fails we say so plainly instead of pretending.
 */
export function EnquiryForm({
  product,
  ctaLocation,
  links,
  onDone,
}: {
  product: Product | null;
  ctaLocation: string;
  links: SocialLinks;
  onDone: () => void;
}) {
  const [form, setForm] = useState<FormState>(initialState);
  // idle -> saving -> handing off. The customer gets feedback at each stage
  // instead of a button that looks inert while the network works.
  const [stage, setStage] = useState<"idle" | "saving" | "handoff">("idle");
  const submitting = stage !== "idle";
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const poster = product ? getProductPoster(product) : null;

  const message = useMemo(
    () =>
      buildProductEnquiryMessage({
        productName: product?.name,
        productSku: product?.sku,
        postUrl: product?.instagram_url,
        quantity: form.quantity,
        requiredDate: form.requiredDate,
        fulfilmentType: form.fulfilmentType || null,
        customization: form.customization,
        message: form.message,
      }),
    [product, form],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(channel: "instagram" | "whatsapp") {
    setStage("saving");
    setError(null);

    // Instagram cannot accept a prefilled DM body, so the message is copied
    // and we open the empty chat thread. WhatsApp takes the text directly.
    const destination = buildEnquiryHandoffUrl(channel, message, links);

    // Opened now, navigated later — a window.open() after an await is a popup.
    const handoffTab = destination ? window.open("", "_blank", "noopener") : null;

    // Same reasoning for the clipboard: inside the gesture or not at all.
    const copied = await copyToClipboard(message);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "product",
          productId: product?.id,
          productSku: product?.sku,
          productName: product?.name,
          customerName: form.customerName || undefined,
          phone: form.phone || undefined,
          quantity: form.quantity || undefined,
          requiredDate: form.requiredDate || undefined,
          fulfilmentType: form.fulfilmentType || undefined,
          customization: form.customization || undefined,
          message: form.message || undefined,
          ...readAttribution(),
        }),
      });

      const result: unknown = await response.json().catch(() => null);
      const ok =
        response.ok &&
        typeof result === "object" &&
        result !== null &&
        (result as { success?: boolean }).success === true;

      if (!ok) {
        const apiMessage =
          typeof result === "object" && result !== null
            ? (result as { error?: { message?: string } }).error?.message
            : undefined;
        throw new Error(apiMessage ?? "We could not save your enquiry.");
      }

      trackEvent("enquiry_submitted", {
        product_id: product?.id,
        product_sku: product?.sku,
        cta_location: ctaLocation,
      });
      trackEvent(channel === "whatsapp" ? "whatsapp_opened" : "instagram_opened", {
        product_sku: product?.sku,
        cta_location: "enquiry_form",
      });

      toast(
        copied
          ? "Enquiry copied. Paste it into the chat that just opened."
          : "Enquiry saved. Please type your message in the chat that just opened.",
        copied ? "success" : "info",
      );

      setStage("handoff");
      await new Promise((resolve) => window.setTimeout(resolve, 550));

      if (handoffTab && destination) {
        handoffTab.location.href = destination;
      } else if (destination) {
        // Popup blocked — a top-level navigation always works.
        window.location.href = destination;
      }

      onDone();
    } catch (submitError) {
      handoffTab?.close();
      const text =
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.";
      setError(text);
      setStage("idle");
      toast(text, "error");
    } finally {
      setStage("idle");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Held for ~0.5s so "copied" is readable before the tab changes. The
          handoff tab was opened synchronously in the click handler, so this
          pause cannot trigger a popup blocker. */}
      {stage === "handoff" ? (
        <RollingBite
          message="Enquiry copied! Taking you to Instagram…"
          note="Paste it into the chat that opens."
        />
      ) : null}

      {product ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-warm p-3">
          <MediaFrame
            src={poster?.url}
            alt={poster?.alt ?? product.name}
            className="size-16 shrink-0"
            sizes="64px"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-cocoa">{product.name}</p>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Product code: {product.sku}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          {({ id }) => (
            <Input
              id={id}
              value={form.customerName}
              onChange={(event) => update("customerName", event.target.value)}
              placeholder="So we know who we're talking to"
              autoComplete="name"
            />
          )}
        </Field>

        <Field label="Phone" hint="Optional, helps us reach you faster.">
          {({ id }) => (
            <Input
              id={id}
              type="tel"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+91"
              autoComplete="tel"
            />
          )}
        </Field>

        <Field label="Quantity">
          {({ id }) => (
            <Input
              id={id}
              value={form.quantity}
              onChange={(event) => update("quantity", event.target.value)}
              placeholder="e.g. 2 boxes"
            />
          )}
        </Field>

        <Field label="Required date">
          {({ id }) => (
            <Input
              id={id}
              type="date"
              min={todayIso()}
              value={form.requiredDate}
              onChange={(event) => update("requiredDate", event.target.value)}
            />
          )}
        </Field>

        <Field label="Delivery or pickup">
          {({ id }) => (
            <Select
              id={id}
              value={form.fulfilmentType}
              onChange={(event) =>
                update("fulfilmentType", event.target.value as FormState["fulfilmentType"])
              }
            >
              <option value="">No preference</option>
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
            </Select>
          )}
        </Field>

        <Field label="Customization">
          {({ id }) => (
            <Input
              id={id}
              value={form.customization}
              onChange={(event) => update("customization", event.target.value)}
              placeholder="e.g. festive packaging"
            />
          )}
        </Field>
      </div>

      <Field label="Anything else?">
        {({ id }) => (
          <Textarea
            id={id}
            rows={3}
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder="Tell us about the occasion, allergies, or anything special."
          />
        )}
      </Field>

      {/* Showing the exact text removes the "what is it going to send?" hesitation. */}
      <div className="rounded-xl border border-line bg-surface-warm p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Your message
        </p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-cocoa">
          {message}
        </pre>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          loading={submitting}
          loadingLabel={stage === "handoff" ? "Enquiry ready!" : "Whipping up your enquiry…"}
          onClick={() => void handleSubmit("instagram")}
        >
          <Copy className="size-4" aria-hidden="true" />
          <InstagramIcon className="size-4" aria-hidden="true" />
          Copy Enquiry &amp; Open Instagram
        </Button>

        {links.whatsappNumber ? (
          <Button
            variant="secondary"
            className="flex-1"
            disabled={submitting}
            onClick={() => void handleSubmit("whatsapp")}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Send on WhatsApp
          </Button>
        ) : null}

        <Button variant="ghost" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
