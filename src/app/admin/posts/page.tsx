import { PostsManager } from "@/components/admin/posts-manager";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminMedia, getAdminPosts } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Posts & Reels" };

export default async function PostsPage() {
  const { supabase } = await requireAdmin();

  const [posts, media] = await Promise.all([
    getAdminPosts(supabase),
    getAdminMedia(supabase, { page: 1 }),
  ]);

  return (
    <>
      <PageHeader
        title="Posts & reels"
        description="Photos and videos shown on your website. These do not post to Instagram. They link to it."
      />
      <PostsManager posts={posts} assets={media.rows} />
    </>
  );
}
