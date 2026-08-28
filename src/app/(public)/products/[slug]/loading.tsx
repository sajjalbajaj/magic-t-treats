import { BakerySkeleton } from "@/components/ui/loaders";

export default function ProductLoading() {
  return (
    <div className="container-page py-10" aria-busy="true">
      <span className="sr-only">Loading</span>

      <BakerySkeleton className="mb-6 h-10 w-80 max-w-full" rounded="rounded-lg" />

      <div className="grid gap-6 md:grid-cols-2">
        <BakerySkeleton className="aspect-square w-full" />

        <div className="flex flex-col gap-4">
          <BakerySkeleton className="h-4 w-40" rounded="rounded-md" />
          <BakerySkeleton className="h-6 w-32" rounded="rounded-md" />
          <div className="flex gap-2">
            <BakerySkeleton className="h-6 w-24" rounded="rounded-(--radius-pill)" />
            <BakerySkeleton className="h-6 w-20" rounded="rounded-(--radius-pill)" />
          </div>
          <BakerySkeleton className="h-4 w-full" rounded="rounded-md" />
          <BakerySkeleton className="h-4 w-full" rounded="rounded-md" />
          <BakerySkeleton className="h-4 w-2/3" rounded="rounded-md" />
          <div className="mt-auto flex gap-2 pt-4">
            <BakerySkeleton className="h-11 flex-1" rounded="rounded-(--radius-pill)" />
            <BakerySkeleton className="h-11 w-28" rounded="rounded-(--radius-pill)" />
          </div>
        </div>
      </div>
    </div>
  );
}
