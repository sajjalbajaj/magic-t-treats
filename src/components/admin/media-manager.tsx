"use client";

import { useState } from "react";
import { Check, Copy, Film, Images } from "lucide-react";

import { ActionButton } from "@/components/admin/action-controls";
import { UploadPanel } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useActionForm } from "@/components/admin/use-action-form";
import { useToast } from "@/components/ui/toast";
import { deleteMediaAction, updateMediaAction } from "@/app/actions/media";
import { mediaFolders } from "@/config/site";
import { copyToClipboard } from "@/lib/clipboard";
import { formatBytes, formatDate } from "@/lib/utils";
import type { MediaAssetRow } from "@/types/database";
import { MediaFrame } from "@/components/ui/media-frame";

export function MediaManager({ assets }: { assets: MediaAssetRow[] }) {
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<MediaAssetRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  async function copyUrl(asset: MediaAssetRow) {
    if (!asset.public_url) return;
    const copied = await copyToClipboard(asset.public_url);
    if (copied) {
      setCopiedId(asset.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } else {
      toast("Could not copy the link.", "error");
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="admin" onClick={() => setUploading(true)}>
          Upload file
        </Button>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          title="Your media library is empty"
          description="Upload photos and videos here once, then reuse them across products, posts and collections."
          icon={<Images className="size-6" aria-hidden="true" />}
          action={
            <Button variant="admin" onClick={() => setUploading(true)}>
              Upload your first file
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.id}>
              <Card className="flex h-full flex-col gap-2 p-3">
                <span className="relative block aspect-square overflow-hidden rounded-lg bg-admin-bg">
                  {asset.type === "video" ? (
                    <span className="grid size-full place-items-center">
                      <Film className="size-7 text-admin-muted" aria-hidden="true" />
                    </span>
                  ) : asset.public_url ? (
                    <MediaFrame
                      src={asset.public_url}
                      alt={asset.alt_text ?? asset.file_name}
                      compact
                      rounded={false}
                      className="size-full"
                      sizes="200px"
                    />
                  ) : null}
                  <span className="absolute left-1.5 top-1.5">
                    <Badge tone="neutral">{asset.folder}</Badge>
                  </span>
                </span>

                <div className="flex flex-1 flex-col gap-0.5">
                  <p className="truncate text-xs font-medium text-admin-ink">
                    {asset.file_name}
                  </p>
                  <p className="text-[11px] text-admin-muted">
                    {formatBytes(asset.size_bytes)} · {formatDate(asset.created_at)}
                  </p>
                  {!asset.alt_text ? (
                    <span className="mt-1 w-fit">
                      <Badge tone="warning">No alt text</Badge>
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-1 border-t border-admin-line pt-2">
                  <Button variant="adminGhost" size="sm" onClick={() => setEditing(asset)}>
                    Edit
                  </Button>
                  <Button
                    variant="adminGhost"
                    size="sm"
                    onClick={() => void copyUrl(asset)}
                    aria-label={`Copy link for ${asset.file_name}`}
                  >
                    {copiedId === asset.id ? (
                      <Check className="size-3.5 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>
                  <ActionButton
                    variant="adminGhost"
                    size="sm"
                    className="text-danger"
                    action={deleteMediaAction.bind(null, asset.id)}
                    successMessage="File deleted."
                    confirm="Delete this file permanently? This only works if nothing is using it."
                    confirmTitle="Delete file"
                    confirmLabel="Delete"
                  >
                    Delete
                  </ActionButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={uploading}
        onClose={() => setUploading(false)}
        title="Upload a file"
        description="Images up to 10 MB, videos up to 100 MB."
        size="lg"
      >
        <UploadPanel accept="both" folder="products" />
      </Modal>

      <EditMediaDialog
        key={editing?.id ?? "none"}
        asset={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function EditMediaDialog({
  asset,
  onClose,
}: {
  asset: MediaAssetRow | null;
  onClose: () => void;
}) {
  const { state, formAction, pending } = useActionForm(updateMediaAction, {
    successMessage: "File details updated.",
    onSuccess: onClose,
  });

  return (
    <Modal
      open={asset !== null}
      onClose={onClose}
      title={asset?.file_name ?? "File"}
      size="md"
    >
      {asset ? (
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={asset.id} />

          <Field
            label="Alt text"
            hint="Describe the image for screen readers and search engines."
          >
            {({ id }) => (
              <Input id={id} name="alt_text" defaultValue={asset.alt_text ?? ""} />
            )}
          </Field>

          <Field label="Folder">
            {({ id }) => (
              <Select id={id} name="folder" defaultValue={asset.folder}>
                {mediaFolders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <dl className="grid gap-2 rounded-lg bg-admin-bg p-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-admin-muted">Type</dt>
              <dd className="text-admin-ink">{asset.mime_type}</dd>
            </div>
            <div>
              <dt className="font-semibold text-admin-muted">Size</dt>
              <dd className="text-admin-ink">{formatBytes(asset.size_bytes)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-admin-muted">Path</dt>
              <dd className="break-all font-mono text-admin-ink">{asset.storage_path}</dd>
            </div>
          </dl>

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
              Save
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
