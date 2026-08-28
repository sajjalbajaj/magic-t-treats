import type { ReactNode } from "react";

import { PublicHeader } from "@/components/public/public-header";
import { PublicFooter } from "@/components/public/public-footer";
import { ProductDialogsProvider } from "@/components/product/product-dialogs";
import { getAllContent, getAllSettings, getSocialLinks } from "@/lib/data/content";
import { getCategories } from "@/lib/data/public";

/**
 * Shell for every public page.
 *
 * Holds the one instance of the product and enquiry dialogs, so any card
 * anywhere in the tree can open them without each page wiring up its own.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [content, settings, links, categories] = await Promise.all([
    getAllContent(),
    getAllSettings(),
    getSocialLinks(),
    getCategories(),
  ]);

  return (
    <ProductDialogsProvider
      links={{
        instagramUrl: links.instagramUrl,
        instagramMessageUrl: links.instagramMessageUrl,
        instagramUsername: links.instagramUsername,
        whatsappNumber: links.whatsappNumber,
      }}
    >
      <div className="flex min-h-dvh flex-col">
        <PublicHeader
          bakeryName={settings.general.bakeryName}
          instagramUrl={links.instagramUrl}
          logoUrl={settings.general.logoUrl}
        />

        <main id="main" className="flex-1">
          {children}
        </main>

        <PublicFooter
          content={content["footer.content"]}
          general={settings.general}
          instagramUrl={links.instagramUrl}
          instagramUsername={links.instagramUsername}
          categories={categories.map((category) => ({
            name: category.name,
            slug: category.slug,
          }))}
        />
      </div>
    </ProductDialogsProvider>
  );
}
