import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/lib/brand';
import { profile } from '@/lib/content';
import { noBreakHyphens } from '@/lib/format';
import { asset } from '@/lib/paths';
import { pageMetadata } from '@/lib/seo';
import { bricolage, instrument, jetbrains } from './fonts';
import './globals.css';

const description = `${profile.title} in ${profile.location.city}. Ask my résumé anything.`;

export const metadata: Metadata = {
  // Absolute URLs for the preview image: GitHub Pages until the custom domain is live.
  metadataBase: new URL(SITE_URL),
  title: noBreakHyphens(profile.name),
  description,
  icons: { icon: asset('/icon.png'), apple: asset('/apple-icon.png') },
  ...pageMetadata({ title: noBreakHyphens(profile.name), description, path: '/', type: 'profile' }),
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
