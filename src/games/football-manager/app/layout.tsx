import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
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

const inter = Inter({
  subsets: ['latin'],
  preload: true,
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ballknw.com'),
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        {children}
        <SpeedInsights />
        {IS_STATIC_EXPORT && (
          <>
            {/* consent.js self-injects the cookie banner and only calls
                initAds() after "Accept all" — ads.js stays inert until then. */}
            <Script src="/shared/consent.js" strategy="afterInteractive" />
            <Script src="/shared/ads.js" strategy="afterInteractive" />
          </>
        )}
      </body>
    </html>
  );
}
