import { Badge } from "@/components/ui/primitives";
import { getProductTags } from "@/lib/products/display";
import type { Product } from "@/types/domain";

export function ProductTags({ product, limit }: { product: Product; limit?: number }) {
  const tags = getProductTags(product);
  if (tags.length === 0) return null;

  const shown = typeof limit === "number" ? tags.slice(0, limit) : tags;
  const hidden = tags.length - shown.length;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((tag) => (
        <li key={tag.label}>
          <Badge tone={tag.tone}>{tag.label}</Badge>
        </li>
      ))}
      {hidden > 0 ? (
        <li>
          <Badge tone="neutral">+{hidden}</Badge>
        </li>
      ) : null}
    </ul>
  );
}
