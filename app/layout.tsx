import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { profile } from '@/content';
import { SITE_URL } from '@/lib/brand';
import { asset } from '@/lib/paths';
import { bricolage, instrument, jetbrains } from './fonts';
import './globals.css';

const description = 'Senior Software Developer in San Francisco. Ask my résumé anything.';

export const metadata: Metadata = {
  // Absolute URLs for the preview image: GitHub Pages until the custom domain is live.
  metadataBase: new URL(SITE_URL),
  title: 'Paul‑Valentin Mini',
  description,
  icons: { icon: asset('/icon.png'), apple: asset('/apple-icon.png') },
  openGraph: {
    type: 'website',
    siteName: 'Paul‑Valentin Mini',
    description,
    url: '/',
    images: [
      { url: '/og.png', width: 1200, height: 630, alt: `${profile.name}, ${profile.title}` },
    ],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export const viewport: Viewport = {
  themeColor: '#edefea',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
