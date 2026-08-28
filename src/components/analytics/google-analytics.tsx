import Script from "next/script";

import { gaMeasurementId } from "@/config/site";

/**
 * GA4 loader.
 *
 * Renders nothing when NEXT_PUBLIC_GA_ID is unset, so local development and
 * preview deploys stay out of the production property without a code change.
 * `afterInteractive` keeps the tag off the critical path.
 */
export function GoogleAnalytics() {
  if (!gaMeasurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaMeasurementId}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
