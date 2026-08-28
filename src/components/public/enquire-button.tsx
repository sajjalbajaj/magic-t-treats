"use client";

import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useProductDialogs } from "@/components/product/product-dialogs";

/**
 * Opens the general enquiry dialog.
 *
 * Exists so that otherwise-static sections can keep their server-component
 * status and ship only this one small button to the browser, rather than
 * turning an entire section into a client component for the sake of a CTA.
 */
export function EnquireButton({
  children,
  ctaLocation,
  ...props
}: Omit<ButtonProps, "onClick"> & { children: ReactNode; ctaLocation: string }) {
  const { openEnquiry } = useProductDialogs();
  return (
    <Button onClick={() => openEnquiry(null, ctaLocation)} {...props}>
      {children}
    </Button>
  );
}
