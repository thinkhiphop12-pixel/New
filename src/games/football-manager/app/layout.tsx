import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { BASE_PATH, withBase } from '@/lib/basePath';
import './globals.css';

const inter = Inter({
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
  icons: { icon: withBase('/favicon.svg') },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  // Required for env(safe-area-inset-*) to report anything but 0 — the
  // landscape nav rail sits against the notch edge otherwise.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link
          rel="preload"
          as="fetch"
          crossOrigin="anonymous"
          href={withBase('/data/gamedata.json')}
        />
      </head>
      <body>
        {children}
        <SpeedInsights />
        {/* Google AdSense loader (site verification + library) */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2741492847457362"
          crossOrigin="anonymous"
          data-adsense="1"
          strategy="afterInteractive"
        />
        {/* Shared consent banner + consent-gated ads, served from the site root */}
        <Script src="/shared/consent.js" strategy="afterInteractive" />
        <Script src="/shared/ads.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
