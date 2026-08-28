import type { Metadata, Viewport } from "next";
import { Caveat, DM_Serif_Display, Manrope } from "next/font/google";

import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { getSettings } from "@/lib/data/content";
import { siteUrl } from "@/config/site";

/**
 * Fonts are self-hosted by next/font at build time: no render-blocking request
 * to Google, no layout shift, and no third-party connection on first paint.
 */
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-dm-serif",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

/**
 * Handwritten accent face. Used for kickers, section eyebrows and the accent
 * half of the hero headline — never for body copy, where a script face costs
 * real reading speed.
 */
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-caveat",
});

export async function generateMetadata(): Promise<Metadata> {
  const [seo, general] = await Promise.all([getSettings("seo"), getSettings("general")]);

  // Declaring dimensions lets platforms reserve the right space and choose the
  // large-card layout instead of guessing from a late-loading image.
  const ogImage = seo.ogImageUrl
    ? [{ url: seo.ogImageUrl, width: 1200, height: 630, alt: `${general.bakeryName}, ${general.tagline}` }]
    : undefined;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.defaultTitle,
      // Page titles read "Gallery | Magic T-treats".
      template: `%s | ${general.bakeryName}`,
    },
    description: seo.defaultDescription,
    keywords: seo.keywords,
    applicationName: general.bakeryName,
    authors: [{ name: general.bakeryName }],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: general.bakeryName,
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      url: siteUrl,
      locale: "en_IN",
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.defaultTitle,
      description: seo.defaultDescription,
      images: ogImage,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    icons: general.faviconUrl ? { icon: general.faviconUrl } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#fff9f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${dmSerif.variable} ${manrope.variable} ${caveat.variable}`}>
      <body className="min-h-dvh antialiased">
        {/*
          Scroll-reveal animations render with inline `opacity: 0` in the HTML
          and are only revealed once Motion hydrates. Without JavaScript that
          content would never appear, so force the final state instead.
          `!important` is required: it has to beat Motion's own inline styles.
        */}
        <noscript>
          <style>{`
            [data-reveal] {
              opacity: 1 !important;
              transform: none !important;
              clip-path: none !important;
            }
          `}</style>
        </noscript>

        <GoogleAnalytics />
        <ToastProvider>
          <AnalyticsProvider />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
