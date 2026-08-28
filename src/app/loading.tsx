import { BakeryLoader } from "@/components/ui/loaders";

/**
 * Root loading state — the genuine whole-page wait.
 *
 * Applies to any route without a nearer `loading.tsx`, where there is no
 * known content shape to skeleton. Routes that DO have a shape (the public
 * pages, the gallery, a product) use content-shaped skeletons instead, because
 * a placeholder that matches the layout beats a centred animation.
 *
 * This is where the brand loader earns its place: one focal animation on an
 * otherwise empty screen.
 */
export default function RootLoading() {
  return <BakeryLoader fullScreen />;
}
