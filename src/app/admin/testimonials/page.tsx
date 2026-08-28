import { TestimonialsManager } from "@/components/admin/testimonials-manager";
import { PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminMedia, getAdminTestimonials } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const { supabase } = await requireAdmin();

  const [testimonials, media] = await Promise.all([
    getAdminTestimonials(supabase),
    getAdminMedia(supabase, { page: 1 }),
  ]);

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Customer words shown on the homepage. Publish only what people actually said."
      />
      <TestimonialsManager testimonials={testimonials} assets={media.rows} />
    </>
  );
}
