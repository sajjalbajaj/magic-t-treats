"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Film, ImageOff, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useActionForm } from "@/components/admin/use-action-form";
import { uploadMediaAction } from "@/app/actions/media";
import { mediaFolders, uploadDefaults } from "@/config/site";
import { validateUploadMetadata } from "@/lib/media/validate";
import { cn, formatBytes } from "@/lib/utils";
import type { MediaAssetRow } from "@/types/database";

/**
 * Choose-or-upload control for any media field.
 *
 * The picker deliberately validates the file in the browser before sending it:
 * a 90 MB video that is going to be rejected should be rejected instantly, not
 * after a two-minute upload. The server repeats every check regardless —
 * the client-side pass is a courtesy, not a control.
 */
export function MediaPicker({
  name,
  label,
  assets,
  defaultValue,
  accept = "image",
  folder = "products",
  hint,
  /** Also emits a hidden input carrying the storage path (products need it). */
  pathName,
  typeName,
}: {
  name: string;
  label: string;
  assets: MediaAssetRow[];
  defaultValue?: string | null;
  accept?: "image" | "video" | "both";
  folder?: (typeof mediaFolders)[number];
  hint?: string;
  pathName?: string;
  typeName?: string;
}) {
  const [selected, setSelected] = useState<MediaAssetRow | null>(
    () => assets.find((asset) => asset.public_url === defaultValue) ?? null,
  );
  // A URL can exist without a matching library row (seeded or hand-entered).
  const [rawUrl, setRawUrl] = useState<string | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);

  const visible = useMemo(
    () => (accept === "both" ? assets : assets.filter((asset) => asset.type === accept)),
    [assets, accept],
  );

  const currentUrl = selected?.public_url ?? rawUrl;
  const currentType = selected?.type ?? (accept === "video" ? "video" : "image");

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-admin-ink">{label}</span>
      {hint ? <p className="text-xs text-admin-muted">{hint}</p> : null}

      <input type="hidden" name={name} value={currentUrl ?? ""} />
      {pathName ? (
        <input type="hidden" name={pathName} value={selected?.storage_path ?? ""} />
      ) : null}
      {typeName ? <input type="hidden" name={typeName} value={currentType} /> : null}

      <div className="flex items-center gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-admin-line bg-admin-bg">
          {currentUrl ? (
            currentType === "video" ? (
              <div className="grid size-full place-items-center">
                <Film className="size-6 text-admin-muted" aria-hidden="true" />
              </div>
            ) : (
              <Image src={currentUrl} alt="" fill sizes="80px" className="object-cover" />
            )
          ) : (
            <div className="grid size-full place-items-center">
              <ImageOff className="size-5 text-admin-muted" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="adminGhost" size="sm" onClick={() => setOpen(true)}>
            {currentUrl ? "Change" : "Choose or upload"}
          </Button>
          {currentUrl ? (
            <Button
              variant="adminGhost"
              size="sm"
              onClick={() => {
                setSelected(null);
                setRawUrl(null);
              }}
            >
              <X className="size-4" aria-hidden="true" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <MediaLibraryDialog
        open={open}
        onClose={() => setOpen(false)}
        assets={visible}
        accept={accept}
        folder={folder}
        onSelect={(asset) => {
          setSelected(asset);
          setRawUrl(asset.public_url);
          setOpen(false);
        }}
      />
    </div>
  );
}

export function MediaLibraryDialog({
  open,
  onClose,
  assets,
  accept,
  folder,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  assets: MediaAssetRow[];
  accept: "image" | "video" | "both";
  folder: (typeof mediaFolders)[number];
  onSelect: (asset: MediaAssetRow) => void;
}) {
  const [tab, setTab] = useState<"library" | "upload">("library");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Media library"
      description="Pick an existing file, or upload a new one."
      size="xl"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {(["library", "upload"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                tab === value
                  ? "border-admin-accent bg-admin-accent text-white"
                  : "border-admin-line bg-admin-surface text-admin-muted hover:text-admin-ink",
              )}
            >
              {value === "library" ? "Library" : "Upload new"}
            </button>
          ))}
        </div>

        {tab === "library" ? (
          assets.length === 0 ? (
            <p className="py-10 text-center text-sm text-admin-muted">
              Nothing here yet. Switch to “Upload new” to add your first file.
            </p>
          ) : (
            <ul className="grid max-h-[55dvh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(asset)}
                    className="group flex w-full flex-col gap-1.5 rounded-lg border border-admin-line p-2 text-left transition-colors duration-200 hover:border-admin-accent"
                  >
                    <span className="relative block aspect-square overflow-hidden rounded bg-admin-bg">
                      {asset.type === "video" ? (
                        <span className="grid size-full place-items-center">
                          <Film className="size-6 text-admin-muted" aria-hidden="true" />
                        </span>
                      ) : asset.public_url ? (
                        <Image
                          src={asset.public_url}
                          alt={asset.alt_text ?? asset.file_name}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="truncate text-xs font-medium text-admin-ink">
                      {asset.file_name}
                    </span>
                    <span className="text-[11px] text-admin-muted">
                      {formatBytes(asset.size_bytes)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <UploadPanel accept={accept} folder={folder} onUploaded={onSelect} />
        )}
      </div>
    </Modal>
  );
}

export function UploadPanel({
  accept,
  folder,
  onUploaded,
}: {
  accept: "image" | "video" | "both";
  folder: (typeof mediaFolders)[number];
  onUploaded?: (asset: MediaAssetRow) => void;
}) {
  const { state, formAction, pending } = useActionForm(uploadMediaAction, {
    successMessage: "File uploaded.",
    onSuccess: (asset) => onUploaded?.(asset),
  });
  const [clientError, setClientError] = useState<string | null>(null);

  const acceptAttr =
    accept === "image"
      ? uploadDefaults.imageMimeTypes.join(",")
      : accept === "video"
        ? uploadDefaults.videoMimeTypes.join(",")
        : [...uploadDefaults.imageMimeTypes, ...uploadDefaults.videoMimeTypes].join(",");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="File"
        required
        error={clientError}
        hint={`Images up to ${uploadDefaults.maxImageBytes / (1024 * 1024)} MB, videos up to ${uploadDefaults.maxVideoBytes / (1024 * 1024)} MB.`}
      >
        {({ id }) => (
          <Input
            id={id}
            name="file"
            type="file"
            required
            accept={acceptAttr}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                setClientError(null);
                return;
              }
              // Reject obvious problems before spending the upload.
              const result = validateUploadMetadata(
                { name: file.name, type: file.type, size: file.size },
                {
                  maxImageBytes: uploadDefaults.maxImageBytes,
                  maxVideoBytes: uploadDefaults.maxVideoBytes,
                },
              );
              setClientError(result.ok ? null : result.message);
            }}
            className="file:mr-3 file:rounded file:border-0 file:bg-admin-bg file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-admin-ink"
          />
        )}
      </Field>

      <Field label="Alt text" hint="Describe the photo for screen readers and search engines.">
        {({ id }) => <Input id={id} name="alt_text" placeholder="e.g. Tray of fudgy brownies" />}
      </Field>

      <Field label="Folder">
        {({ id }) => (
          <Select id={id} name="folder" defaultValue={folder}>
            {mediaFolders.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {state && !state.success ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error.message}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="admin"
        loading={pending}
        loadingLabel="Uploading…"
        disabled={Boolean(clientError)}
      >
        <Upload className="size-4" aria-hidden="true" />
        Upload
      </Button>
    </form>
  );
}
