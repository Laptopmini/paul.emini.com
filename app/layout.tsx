import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { bricolage, instrument, jetbrains } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://paul.emini.com'),
  title: 'Paul‑Valentin Mini',
  description: 'Senior Software Developer in San Francisco. Ask my résumé anything.',
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
