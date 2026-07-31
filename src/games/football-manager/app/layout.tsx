import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  preload: true,
  display: 'swap',
});

// Phase 14: display face for headings (--font-display in globals.css),
// loaded the same way as the existing Inter body font — next/font/google,
// self-hosted at build time, no extra network request or new dependency.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  preload: true,
  display: 'swap',
  variable: '--font-display-loaded',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} ${spaceGrotesk.variable}`}>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
