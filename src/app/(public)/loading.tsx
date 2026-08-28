import { BakerySkeleton, ProductCardSkeleton } from "@/components/ui/loaders";

/**
 * Public route loading state.
 *
 * Skeletons in the shape of the real content rather than a centred spinner:
 * the layout does not jump when the data arrives, and the page reads as
 * "nearly here" instead of "nothing yet". The chef-hat loader is saved for
 * whole-page waits, where one animation is a focal point rather than a dozen
 * competing ones.
 */
export default function PublicLoading() {
  return (
    <div className="container-page section-y flex flex-col gap-12" aria-busy="true">
      <span className="sr-only">Loading</span>

      <div className="flex flex-col gap-4">
        <BakerySkeleton className="h-10 w-2/3 max-w-lg" rounded="rounded-lg" />
        <BakerySkeleton className="h-4 w-full max-w-xl" rounded="rounded-md" />
        <BakerySkeleton className="h-4 w-3/4 max-w-lg" rounded="rounded-md" />
      </div>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
