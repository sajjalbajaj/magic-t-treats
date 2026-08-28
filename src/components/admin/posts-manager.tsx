"use client";

import { useState } from "react";
import { Clapperboard, Film } from "lucide-react";

import { ActionButton, ActionToggle } from "@/components/admin/action-controls";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useActionForm } from "@/components/admin/use-action-form";
import { deletePostAction, savePostAction, setPostPublishedAction } from "@/app/actions/content";
import type { Post } from "@/types/domain";
import type { MediaAssetRow } from "@/types/database";
import { MediaFrame } from "@/components/ui/media-frame";

/**
 * Posts and reels shown on the website.
 *
 * This does not publish to Instagram — it manages the site's own feed and
 * links out. The Instagram URL field is what turns a card into a link.
 */
export function PostsManager({
  posts,
  assets,
}: {
  posts: Post[];
  assets: MediaAssetRow[];
}) {
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button variant="admin" onClick={() => setCreating(true)}>
          Add post
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Add photos and reels to fill the “From the Kitchen” and “Watch Them Being Made” sections."
          icon={<Clapperboard className="size-6" aria-hidden="true" />}
          action={
            <Button variant="admin" onClick={() => setCreating(true)}>
              Add your first post
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Card className="flex h-full flex-col gap-3">
                <span className="relative block aspect-square overflow-hidden rounded-lg bg-admin-bg">
                  {post.type === "video" ? (
                    post.thumbnail_url ? (
                      <MediaFrame
                        src={post.thumbnail_url}
                        alt=""
                        compact
                        rounded={false}
                        className="size-full"
                        sizes="240px"
                      />
                    ) : (
                      <span className="grid size-full place-items-center">
                        <Film className="size-7 text-admin-muted" aria-hidden="true" />
                      </span>
                    )
                  ) : post.media_url ? (
                    <MediaFrame
                      src={post.media_url}
                      alt={post.title ?? ""}
                      compact
                      rounded={false}
                      className="size-full"
                      sizes="240px"
                    />
                  ) : null}

                  <span className="absolute left-2 top-2">
                    <Badge tone={post.type === "video" ? "accent" : "blush"}>
                      {post.type === "video" ? "Reel" : "Photo"}
                    </Badge>
                  </span>
                </span>

                <div className="flex flex-1 flex-col gap-1">
                  <p className="font-semibold text-admin-ink">{post.title ?? "Untitled"}</p>
                  {post.caption ? (
                    <p className="clamp-2 text-xs leading-relaxed text-admin-muted">
                      {post.caption}
                    </p>
                  ) : null}
                  {post.show_on_homepage ? (
                    <span className="mt-1 w-fit">
                      <Badge tone="neutral">On homepage</Badge>
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-admin-line pt-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-admin-muted">
                    <ActionToggle
                      checked={post.published}
                      label={`Publish ${post.title ?? "post"}`}
                      action={setPostPublishedAction.bind(null, post.id)}
                    />
                    {post.published ? "Live" : "Draft"}
                  </label>

                  <div className="flex gap-1">
                    <Button variant="adminGhost" size="sm" onClick={() => setEditing(post)}>
                      Edit
                    </Button>
                    <ActionButton
                      variant="adminGhost"
                      size="sm"
                      className="text-danger"
                      action={deletePostAction.bind(null, post.id)}
                      successMessage="Post deleted."
                      confirm="Delete this post? The file stays in your media library."
                      confirmTitle="Delete post"
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

      <PostDialog
        open={creating}
        post={null}
        assets={assets}
        onClose={() => setCreating(false)}
      />
      <PostDialog
        key={editing?.id ?? "none"}
        open={editing !== null}
        post={editing}
        assets={assets}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function PostDialog({
  open,
  post,
  assets,
  onClose,
}: {
  open: boolean;
  post: Post | null;
  assets: MediaAssetRow[];
  onClose: () => void;
}) {
  const { state, formAction, pending } = useActionForm(savePostAction, {
    successMessage: "Post saved.",
    onSuccess: onClose,
  });

  // Remounted via `key` when a different post is opened, so this initialiser
  // is enough — no effect needed to re-sync it.
  const [type, setType] = useState<"image" | "video">(post?.type ?? "image");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={post ? "Edit post" : "Add a post"}
      description="Shown in the Instagram gallery and, for videos, in Watch Them Being Made."
      size="lg"
    >
      <form action={formAction} className="flex flex-col gap-4">
        {post ? <input type="hidden" name="id" value={post.id} /> : null}

        <Field label="Type">
          {({ id }) => (
            <Select
              id={id}
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as "image" | "video")}
            >
              <option value="image">Photo</option>
              <option value="video">Reel / video</option>
            </Select>
          )}
        </Field>

        <MediaPicker
          key={`${post?.id ?? "new"}-${type}`}
          name="media_url"
          label={type === "video" ? "Video file" : "Photo"}
          assets={assets}
          defaultValue={post?.media_url}
          accept={type}
          folder="posts"
          pathName="storage_path"
        />

        {type === "video" ? (
          <MediaPicker
            name="thumbnail_url"
            label="Cover image"
            hint="Shown before the video plays. Strongly recommended."
            assets={assets}
            defaultValue={post?.thumbnail_url}
            accept="image"
            folder="posts"
          />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            {({ id }) => <Input id={id} name="title" defaultValue={post?.title ?? ""} />}
          </Field>

          <Field label="Sort order" hint="Lower numbers appear first.">
            {({ id }) => (
              <Input
                id={id}
                name="sort_order"
                type="number"
                step="1"
                defaultValue={post?.sort_order ?? 0}
              />
            )}
          </Field>
        </div>

        <Field label="Caption">
          {({ id }) => (
            <Textarea id={id} name="caption" rows={3} defaultValue={post?.caption ?? ""} />
          )}
        </Field>

        <Field
          label="Instagram link"
          hint="Paste the post URL so visitors can open it on Instagram."
        >
          {({ id }) => (
            <Input
              id={id}
              name="instagram_url"
              type="url"
              defaultValue={post?.instagram_url ?? ""}
              placeholder="https://www.instagram.com/p/…"
            />
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox
            name="show_on_homepage"
            label="Show on homepage"
            defaultChecked={post ? post.show_on_homepage : true}
          />
          <Checkbox
            name="published"
            label="Published"
            description="Visible on the website."
            defaultChecked={post ? post.published : true}
          />
        </div>

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
            Save post
          </Button>
        </div>
      </form>
    </Modal>
  );
}
