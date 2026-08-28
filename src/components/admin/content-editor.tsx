"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useActionForm } from "@/components/admin/use-action-form";
import { saveContentBlockAction } from "@/app/actions/content";
import { cn } from "@/lib/utils";
import type { MediaAssetRow } from "@/types/database";

export type ContentBlock = {
  key: string;
  title: string;
  description: string;
  value: Record<string, unknown>;
};

/**
 * Website copy editor.
 *
 * Renders ordinary labelled inputs derived from each block's shape, so the
 * baker edits "Heading" and "Description" rather than a JSON document. The
 * field naming here is the other half of the parser in saveContentBlockAction:
 *
 *   string        -> <input name="field">
 *   string[]      -> <textarea name="field">, one item per line
 *   {title,desc}[] -> repeated name="field__title" / "field__description"
 */
export function ContentEditor({
  blocks,
  assets,
}: {
  blocks: ContentBlock[];
  assets: MediaAssetRow[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => (
        <ContentBlockForm
          key={block.key}
          block={block}
          assets={assets}
          defaultOpen={index === 0}
        />
      ))}
    </div>
  );
}

/** "primaryButton" -> "Primary button". */
function humanise(field: string): string {
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function isMediaField(field: string): boolean {
  return /url$/i.test(field) && /(photo|image|media|cover|og)/i.test(field);
}

function isLongText(field: string, value: unknown): boolean {
  return (
    typeof value === "string" &&
    (value.length > 90 || /description|story|biography|caption|note|tagline/i.test(field))
  );
}

function ContentBlockForm({
  block,
  assets,
  defaultOpen,
}: {
  block: ContentBlock;
  assets: MediaAssetRow[];
  defaultOpen: boolean;
}) {
  const { state, formAction, pending } = useActionForm(saveContentBlockAction, {
    successMessage: `${block.title} updated.`,
  });
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex flex-col gap-0.5">
          <span className="font-sans text-base font-bold text-admin-ink">{block.title}</span>
          <span className="text-xs text-admin-muted">{block.description}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-admin-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <form action={formAction} className="flex flex-col gap-4 border-t border-admin-line p-5">
          <input type="hidden" name="content_key" value={block.key} />

          {Object.entries(block.value).map(([field, value]) => {
            if (Array.isArray(value)) {
              const first = value[0];

              if (first && typeof first === "object") {
                const items = value as { title?: string; description?: string }[];
                return (
                  <fieldset key={field} className="flex flex-col gap-3">
                    <legend className="text-sm font-semibold text-admin-ink">
                      {humanise(field)}
                    </legend>
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="grid gap-3 rounded-lg border border-admin-line p-3 sm:grid-cols-2"
                      >
                        <Field label={`Item ${index + 1} title`}>
                          {({ id }) => (
                            <Input
                              id={id}
                              name={`${field}__title`}
                              defaultValue={item.title ?? ""}
                            />
                          )}
                        </Field>
                        <Field label="Description">
                          {({ id }) => (
                            <Textarea
                              id={id}
                              name={`${field}__description`}
                              rows={2}
                              defaultValue={item.description ?? ""}
                            />
                          )}
                        </Field>
                      </div>
                    ))}
                  </fieldset>
                );
              }

              return (
                <Field
                  key={field}
                  label={humanise(field)}
                  hint="One per line."
                >
                  {({ id }) => (
                    <Textarea
                      id={id}
                      name={field}
                      rows={Math.max(3, value.length)}
                      defaultValue={(value as string[]).join("\n")}
                    />
                  )}
                </Field>
              );
            }

            if (isMediaField(field)) {
              return (
                <MediaPicker
                  key={field}
                  name={field}
                  label={humanise(field).replace(/ url$/i, "")}
                  assets={assets}
                  defaultValue={typeof value === "string" ? value : null}
                  accept={field.toLowerCase().includes("media") ? "both" : "image"}
                  folder={block.key.startsWith("about") ? "about" : "branding"}
                />
              );
            }

            // mediaType is driven by which file is chosen, not typed by hand.
            if (field === "mediaType") {
              return (
                <input
                  key={field}
                  type="hidden"
                  name={field}
                  value={typeof value === "string" ? value : "image"}
                />
              );
            }

            return (
              <Field key={field} label={humanise(field)}>
                {({ id }) =>
                  isLongText(field, value) ? (
                    <Textarea
                      id={id}
                      name={field}
                      rows={3}
                      defaultValue={typeof value === "string" ? value : ""}
                    />
                  ) : (
                    <Input
                      id={id}
                      name={field}
                      defaultValue={typeof value === "string" ? value : ""}
                    />
                  )
                }
              </Field>
            );
          })}

          {state && !state.success ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {state.error.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" variant="admin" loading={pending} loadingLabel="Publishing…">
              Publish changes
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
