import type { Metadata, Viewport } from 'next';
import { Oswald } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import './globals.css';

// The shared consent/ads scripts live at /shared/*.js, resolved from the
// site root. That path only exists once this app is exported into the
// `gaffa/` static folder under ballknw.com — in `next dev` it 404s (which is
// exactly why these were pulled from this layout before, in c65ebb6). Gate
// on the same NEXT_PUBLIC_BASE_PATH the static export sets
// (scripts/export-static.sh), so dev stays clean and only the real deployed
// build loads them.
const IS_STATIC_EXPORT = !!process.env.NEXT_PUBLIC_BASE_PATH;

// Condensed sport grotesque — broadcast-scoreboard territory, not the
// geometric-sans fintech look Inter reads as here.
const oswald = Oswald({
  subsets: ['latin'],
  preload: true,
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.ballknw.com'),
  title: 'Gaffa — BALLKNW',
  description:
    'Take charge of a club: pick your formation, work the transfer market, and manage your way through a full league season. Free browser game, no account needed.',
  alternates: { canonical: '/gaffa/' },
  openGraph: {
    siteName: 'BALLKNW',
    url: '/gaffa/',
    title: 'Gaffa — BALLKNW',
    description:
      'Pick your formation, work the transfer market, and manage a full season — promotion, relegation and all.',
    images: ['/assets/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaffa — BALLKNW',
    images: ['/assets/og-image.png'],
  },
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg` },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/* The Google tag, matching the snippet the hand-written pages carry in
   <head>. dataLayer is an ordered queue, so pushing the Consent Mode
   defaults from this inline script before the gtag.js library finishes
   loading is what makes them apply — shared/consent.js later relays the
   visitor's banner choice with gtag('consent','update'). Gated on the
   static export for the same reason the shared scripts are: `next dev`
   should not report itself as production traffic. */
const GA_ID = 'G-YK8TS0NPNG';
const GTAG_BOOTSTRAP = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});
gtag('js', new Date());
gtag('config', '${GA_ID}');`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={oswald.className}>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
        {IS_STATIC_EXPORT && (
          <>
            <Script id="gtag-init" strategy="afterInteractive">
              {GTAG_BOOTSTRAP}
            </Script>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            {/* consent.js self-injects the cookie banner and only calls
                initAds() after "Accept all" — ads.js stays inert until then. */}
            <Script src="/shared/consent.min.js" strategy="afterInteractive" />
            <Script src="/shared/ads.min.js" strategy="afterInteractive" />
            {/* comp.js exposes window.BKComp so the season-end screen can
                report a referral conversion and read the player's share link.
                Inert while the prize draw is switched off. */}
            <Script src="/shared/comp.js" strategy="afterInteractive" />
            {/* auth.js exposes window.BKAuth for optional cloud saves. The
                Supabase SDK is only fetched if someone actually signs in. */}
            <Script src="/shared/auth.js" strategy="afterInteractive" />
          </>
        )}
      </body>
    </html>
  );
}
