"use client";

import { useMemo, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/ui/brand-icons";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { RollingBite } from "@/components/ui/loaders";
import { buildCustomOrderMessage, buildEnquiryHandoffUrl } from "@/lib/enquiry/message";
import { copyToClipboard } from "@/lib/clipboard";
import { readAttribution, trackEvent } from "@/lib/analytics/track-event";
import { customOrderSchemaWithContact } from "@/lib/validation/enquiry";
import { todayIso } from "@/lib/utils";
import type { SocialLinks } from "@/components/product/product-dialogs";

type FormState = {
  customerName: string;
  phone: string;
  email: string;
  requiredDate: string;
  occasion: string;
  quantity: string;
  productsInterested: string;
  sugarFreeRequired: boolean;
  packaging: string;
  budget: string;
  fulfilmentType: "" | "delivery" | "pickup";
  message: string;
};

const initialState: FormState = {
  customerName: "",
  phone: "",
  email: "",
  requiredDate: "",
  occasion: "",
  quantity: "",
  productsInterested: "",
  sugarFreeRequired: false,
  packaging: "",
  budget: "",
  fulfilmentType: "",
  message: "",
};

/**
 * Custom / bulk order form.
 *
 * Same handoff mechanics as the product enquiry (popup and clipboard inside
 * the gesture), but this one validates client-side first with the same Zod
 * schema the API uses — a longer form deserves inline errors rather than a
 * round trip to find out a field was missing.
 */
export function CustomOrderForm({ links }: { links: SocialLinks }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // idle -> saving -> handing off. The customer gets feedback at each stage
  // instead of a button that looks inert while the network works.
  const [stage, setStage] = useState<"idle" | "saving" | "handoff">("idle");
  const submitting = stage !== "idle";
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const message = useMemo(
    () =>
      buildCustomOrderMessage({
        customerName: form.customerName,
        occasion: form.occasion,
        requiredDate: form.requiredDate,
        quantity: form.quantity,
        productName: form.productsInterested,
        sugarFreeRequired: form.sugarFreeRequired,
        packaging: form.packaging,
        budget: form.budget,
        fulfilmentType: form.fulfilmentType || null,
        message: form.message,
      }),
    [form],
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function handleSubmit(channel: "instagram" | "whatsapp") {
    const payload = {
      kind: "custom" as const,
      customerName: form.customerName,
      phone: form.phone || undefined,
      email: form.email || undefined,
      requiredDate: form.requiredDate || undefined,
      occasion: form.occasion || undefined,
      quantity: form.quantity || undefined,
      productsInterested: form.productsInterested || undefined,
      sugarFreeRequired: form.sugarFreeRequired,
      packaging: form.packaging || undefined,
      budget: form.budget || undefined,
      fulfilmentType: form.fulfilmentType || undefined,
      message: form.message || undefined,
      ...readAttribution(),
    };

    const parsed = customOrderSchemaWithContact.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      toast("Please check the highlighted fields.", "error");
      return;
    }

    setStage("saving");
    setErrors({});

    // Instagram cannot accept a prefilled DM body, so the message is copied
    // and we open the empty chat thread. WhatsApp takes the text directly.
    const destination = buildEnquiryHandoffUrl(channel, message, links);

    const handoffTab = destination ? window.open("", "_blank", "noopener") : null;
    const copied = await copyToClipboard(message);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        throw new Error(apiMessage ?? "We could not save your request.");
      }

      trackEvent("custom_order_submitted", { cta_location: "custom_order_form" });
      trackEvent(channel === "whatsapp" ? "whatsapp_opened" : "instagram_opened", {
        cta_location: "custom_order_form",
      });

      setSubmitted(true);
      toast(
        copied
          ? "Request saved and copied. Paste it into the chat that just opened."
          : "Request saved. Please describe your order in the chat that just opened.",
        copied ? "success" : "info",
      );

      setStage("handoff");
      await new Promise((resolve) => window.setTimeout(resolve, 550));

      if (handoffTab && destination) {
        handoffTab.location.href = destination;
      } else if (destination) {
        window.location.href = destination;
      }
    } catch (submitError) {
      handoffTab?.close();
      const text =
        submitError instanceof Error ? submitError.message : "Something went wrong.";
      setErrors({ form: text });
      setStage("idle");
      toast(text, "error");
    } finally {
      setStage("idle");
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-(--radius-card) border border-sage/40 bg-sage/10 px-6 py-14 text-center">
        <h2 className="text-2xl">Thank you. We have your request.</h2>
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          Your enquiry is with us and your message has been copied to your clipboard. Paste it
          into the chat and we will confirm availability and pricing shortly.
        </p>
        <Button variant="secondary" onClick={() => { setForm(initialState); setSubmitted(false); }}>
          Send another request
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit("instagram");
      }}
    >
      {stage === "handoff" ? (
        <RollingBite
          message="Request copied! Taking you to Instagram…"
          note="Paste it into the chat that opens."
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={errors.customerName}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={form.customerName}
              onChange={(event) => update("customerName", event.target.value)}
              autoComplete="name"
              required
            />
          )}
        </Field>

        <Field
          label="Phone"
          hint="Phone or email, whichever you prefer."
          error={errors.phone}
        >
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              type="tel"
              invalid={invalid}
              aria-describedby={describedBy}
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+91"
              autoComplete="tel"
            />
          )}
        </Field>

        <Field label="Email" error={errors.email}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              type="email"
              invalid={invalid}
              aria-describedby={describedBy}
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
            />
          )}
        </Field>

        <Field label="Required date" error={errors.requiredDate}>
          {({ id, invalid }) => (
            <Input
              id={id}
              type="date"
              invalid={invalid}
              min={todayIso()}
              value={form.requiredDate}
              onChange={(event) => update("requiredDate", event.target.value)}
            />
          )}
        </Field>

        <Field label="Occasion">
          {({ id }) => (
            <Input
              id={id}
              value={form.occasion}
              onChange={(event) => update("occasion", event.target.value)}
              placeholder="Birthday, wedding favours, corporate gifting…"
            />
          )}
        </Field>

        <Field label="Approximate quantity">
          {({ id }) => (
            <Input
              id={id}
              value={form.quantity}
              onChange={(event) => update("quantity", event.target.value)}
              placeholder="e.g. 50 boxes"
            />
          )}
        </Field>

        <Field label="Approximate budget">
          {({ id }) => (
            <Input
              id={id}
              value={form.budget}
              onChange={(event) => update("budget", event.target.value)}
              placeholder="Optional, helps us suggest options"
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
      </div>

      <Field label="Products you're interested in">
        {({ id }) => (
          <Textarea
            id={id}
            rows={2}
            value={form.productsInterested}
            onChange={(event) => update("productsInterested", event.target.value)}
            placeholder="Brownies, assorted chocolates, gift boxes…"
          />
        )}
      </Field>

      <Field label="Packaging requirements">
        {({ id }) => (
          <Textarea
            id={id}
            rows={2}
            value={form.packaging}
            onChange={(event) => update("packaging", event.target.value)}
            placeholder="Ribbons, name cards, company logo on the sleeve…"
          />
        )}
      </Field>

      <Checkbox
        label="Sugar-free options required"
        description="We can make most of the menu without refined sugar."
        checked={form.sugarFreeRequired}
        onChange={(event) => update("sugarFreeRequired", event.target.checked)}
      />

      <Field label="Anything else we should know?">
        {({ id }) => (
          <Textarea
            id={id}
            rows={4}
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder="Allergies, delivery addresses, timings…"
          />
        )}
      </Field>

      <div className="rounded-xl border border-line bg-surface-warm p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Your message
        </p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-cocoa">
          {message}
        </pre>
      </div>

      {errors.form ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors.form}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          className="flex-1"
          loading={submitting}
          loadingLabel={stage === "handoff" ? "Request ready!" : "Whipping up your request…"}
        >
          <Copy className="size-4" aria-hidden="true" />
          <InstagramIcon className="size-4" aria-hidden="true" />
          Copy Request &amp; Open Instagram
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
      </div>
    </form>
  );
}
