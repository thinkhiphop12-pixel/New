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
  title: 'BALLKNW Draft XI — Can you go 8-0 at the World Cup?',
  description:
    'Draft five World Cup legends, simulate a tournament run, and try to win every match. Free browser game, no account needed.',
  alternates: { canonical: '/perfect-cup/' },
  openGraph: {
    siteName: 'BALLKNW',
    url: '/perfect-cup/',
    title: 'BALLKNW Draft XI — Can you go 8-0 at the World Cup?',
    description:
      'Draft five World Cup legends, simulate a tournament run, and try to win every match.',
    images: ['/assets/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BALLKNW Draft XI — Can you go 8-0 at the World Cup?',
    images: ['/assets/og-image.png'],
  },
  icons: { icon: '/favicon.svg' },
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
