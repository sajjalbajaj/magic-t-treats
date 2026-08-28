"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Modal } from "@/components/ui/modal";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { ProductDetail } from "@/components/product/product-detail";
import { trackEvent } from "@/lib/analytics/track-event";
import type { Product } from "@/types/domain";

export type SocialLinks = {
  /** Profile grid, for "follow us" links. */
  instagramUrl: string;
  /** DM thread, for the enquiry handoff. */
  instagramMessageUrl: string;
  instagramUsername: string;
  whatsappNumber: string;
};

type ProductDialogsValue = {
  openProduct: (product: Product, ctaLocation?: string) => void;
  openEnquiry: (product: Product | null, ctaLocation?: string) => void;
  links: SocialLinks;
};

const ProductDialogsContext = createContext<ProductDialogsValue | null>(null);

/**
 * Owns the product detail and enquiry dialogs for the whole public site.
 *
 * Product cards appear in six different sections (bestsellers, available
 * today, the explorer, collections, the gallery, search results). Rendering a
 * modal per card would mean six copies of the same dialog in the DOM and six
 * competing focus traps; hoisting them here means exactly one of each exists,
 * and any card can open it by calling the hook.
 */
export function ProductDialogsProvider({
  links,
  children,
}: {
  links: SocialLinks;
  children: ReactNode;
}) {
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [enquiryProduct, setEnquiryProduct] = useState<Product | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [ctaLocation, setCtaLocation] = useState("product_card");

  const openProduct = useCallback((product: Product, location = "product_card") => {
    setDetailProduct(product);
    setCtaLocation(location);
    trackEvent("product_view", {
      product_id: product.id,
      product_sku: product.sku,
      cta_location: location,
    });
  }, []);

  const openEnquiry = useCallback((product: Product | null, location = "product_card") => {
    setEnquiryProduct(product);
    setCtaLocation(location);
    setEnquiryOpen(true);

    if (product) {
      trackEvent("product_enquiry_click", {
        product_id: product.id,
        product_sku: product.sku,
        cta_location: location,
      });
    } else {
      trackEvent("custom_order_started", { cta_location: location });
    }
  }, []);

  const value = useMemo<ProductDialogsValue>(
    () => ({ openProduct, openEnquiry, links }),
    [openProduct, openEnquiry, links],
  );

  return (
    <ProductDialogsContext.Provider value={value}>
      {children}

      <Modal
        open={detailProduct !== null}
        onClose={() => setDetailProduct(null)}
        title={detailProduct?.name ?? "Product"}
        size="xl"
      >
        {detailProduct ? (
          <ProductDetail
            product={detailProduct}
            onEnquire={() => {
              // Hand straight over to the enquiry dialog, keeping the product.
              const product = detailProduct;
              setDetailProduct(null);
              openEnquiry(product, "product_modal");
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        title={enquiryProduct ? `Enquire about ${enquiryProduct.name}` : "Send an enquiry"}
        description="We'll prepare your message, save your enquiry, then open the chat for you."
        size="lg"
      >
        <EnquiryForm
          product={enquiryProduct}
          ctaLocation={ctaLocation}
          links={links}
          onDone={() => setEnquiryOpen(false)}
        />
      </Modal>
    </ProductDialogsContext.Provider>
  );
}

export function useProductDialogs(): ProductDialogsValue {
  const context = useContext(ProductDialogsContext);
  if (!context) {
    throw new Error("useProductDialogs must be used inside a <ProductDialogsProvider>.");
  }
  return context;
}
