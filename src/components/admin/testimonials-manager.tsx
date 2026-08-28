"use client";

import { useState } from "react";
import { Quote, Star } from "lucide-react";

import { ActionButton, ActionToggle } from "@/components/admin/action-controls";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useActionForm } from "@/components/admin/use-action-form";
import {
  deleteTestimonialAction,
  saveTestimonialAction,
  setTestimonialPublishedAction,
} from "@/app/actions/content";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/types/domain";
import type { MediaAssetRow } from "@/types/database";

export function TestimonialsManager({
  testimonials,
  assets,
}: {
  testimonials: Testimonial[];
  assets: MediaAssetRow[];
}) {
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button variant="admin" onClick={() => setCreating(true)}>
          Add testimonial
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <EmptyState
          title="No testimonials have been added"
          description="Real customer words do more for trust than anything else on the page."
          icon={<Quote className="size-6" aria-hidden="true" />}
          action={
            <Button variant="admin" onClick={() => setCreating(true)}>
              Add the first one
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <li key={testimonial.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-admin-ink">{testimonial.customer_name}</p>
                    {testimonial.source ? (
                      <p className="text-xs text-admin-muted">via {testimonial.source}</p>
                    ) : null}
                  </div>

                  {testimonial.rating ? (
                    <div
                      className="flex gap-0.5"
                      aria-label={`${testimonial.rating} out of 5`}
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          aria-hidden="true"
                          className={cn(
                            "size-3.5",
                            index < (testimonial.rating ?? 0)
                              ? "fill-accent text-accent"
                              : "text-admin-line",
                          )}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                <p className="flex-1 text-sm leading-relaxed text-admin-ink">
                  {testimonial.message}
                </p>

                <div className="flex items-center justify-between gap-3 border-t border-admin-line pt-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-admin-muted">
                    <ActionToggle
                      checked={testimonial.published}
                      label={`Publish testimonial from ${testimonial.customer_name}`}
                      action={setTestimonialPublishedAction.bind(null, testimonial.id)}
                    />
                    {testimonial.published ? "Published" : "Hidden"}
                  </label>

                  <div className="flex gap-1">
                    <Button
                      variant="adminGhost"
                      size="sm"
                      onClick={() => setEditing(testimonial)}
                    >
                      Edit
                    </Button>
                    <ActionButton
                      variant="adminGhost"
                      size="sm"
                      className="text-danger"
                      action={deleteTestimonialAction.bind(null, testimonial.id)}
                      successMessage="Testimonial deleted."
                      confirm="Delete this testimonial? This cannot be undone."
                      confirmTitle="Delete testimonial"
                      confirmLabel="Delete"
                    >
                      Delete
                    </ActionButton>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <TestimonialDialog
        open={creating}
        testimonial={null}
        assets={assets}
        onClose={() => setCreating(false)}
      />
      <TestimonialDialog
        key={editing?.id ?? "none"}
        open={editing !== null}
        testimonial={editing}
        assets={assets}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function TestimonialDialog({
  open,
  testimonial,
  assets,
  onClose,
}: {
  open: boolean;
  testimonial: Testimonial | null;
  assets: MediaAssetRow[];
  onClose: () => void;
}) {
  const { state, formAction, pending } = useActionForm(saveTestimonialAction, {
    successMessage: "Testimonial saved.",
    onSuccess: onClose,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={testimonial ? "Edit testimonial" : "Add a testimonial"}
      size="lg"
    >
      <form action={formAction} className="flex flex-col gap-4">
        {testimonial ? <input type="hidden" name="id" value={testimonial.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer name" required>
            {({ id }) => (
              <Input
                id={id}
                name="customer_name"
                required
                defaultValue={testimonial?.customer_name ?? ""}
                placeholder="e.g. Priya S."
              />
            )}
          </Field>

          <Field label="Where it came from">
            {({ id }) => (
              <Select id={id} name="source" defaultValue={testimonial?.source ?? "Instagram"}>
                <option value="Instagram">Instagram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Google">Google</option>
                <option value="In person">In person</option>
              </Select>
            )}
          </Field>
        </div>

        <Field label="What they said" required>
          {({ id }) => (
            <Textarea
              id={id}
              name="message"
              rows={4}
              required
              defaultValue={testimonial?.message ?? ""}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating">
            {({ id }) => (
              <Select id={id} name="rating" defaultValue={String(testimonial?.rating ?? 5)}>
                <option value="">No rating</option>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} star{value === 1 ? "" : "s"}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Sort order" hint="Lower numbers appear first.">
            {({ id }) => (
              <Input
                id={id}
                name="sort_order"
                type="number"
                step="1"
                defaultValue={testimonial?.sort_order ?? 0}
              />
            )}
          </Field>
        </div>

        <MediaPicker
          name="screenshot_url"
          label="Screenshot (optional)"
          hint="A screenshot of the original message, if you have one."
          assets={assets}
          defaultValue={testimonial?.screenshot_url}
          accept="image"
          folder="testimonials"
        />

        <input type="hidden" name="published" value={testimonial?.published === false ? "" : "on"} />

        {state && !state.success ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {state.error.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="adminGhost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="admin" loading={pending} loadingLabel="Saving…">
            Save testimonial
          </Button>
        </div>
      </form>
    </Modal>
  );
}
