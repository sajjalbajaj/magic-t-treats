import { BakerySkeleton } from "@/components/ui/loaders";

/** Masonry-shaped skeleton, so the grid does not reflow when photos arrive. */
export default function GalleryLoading() {
  // Varied heights mirror the real masonry column flow.
  const heights = ["h-64", "h-80", "h-56", "h-72", "h-60", "h-80", "h-56", "h-68"];

  return (
    <div className="container-page section-y flex flex-col gap-8" aria-busy="true">
      <span className="sr-only">Loading</span>

      <div className="flex flex-col gap-3">
        <BakerySkeleton className="h-9 w-64" rounded="rounded-lg" />
        <BakerySkeleton className="h-4 w-96 max-w-full" rounded="rounded-md" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <BakerySkeleton key={index} className="h-9 w-24" rounded="rounded-(--radius-pill)" />
        ))}
      </div>

      <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
        {heights.map((height, index) => (
          <BakerySkeleton key={index} className={`w-full ${height}`} />
        ))}
      </div>
    </div>
  );
}
