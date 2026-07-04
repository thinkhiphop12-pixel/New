import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  preload: true,
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ballknw.com'),
  title: 'Gaffer — BALLKNW',
  description:
    'Take charge of a club: pick your formation, work the transfer market, and manage your way through a full league season. Free browser game, no account needed.',
  alternates: { canonical: '/football-manager/' },
  openGraph: {
    siteName: 'BALLKNW',
    url: '/football-manager/',
    title: 'Gaffer — BALLKNW',
    description:
      'Pick your formation, work the transfer market, and manage a full season — promotion, relegation and all.',
    images: ['/assets/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaffer — BALLKNW',
    images: ['/assets/og-image.png'],
  },
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg` },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        {children}
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
