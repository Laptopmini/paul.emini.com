import localFont from 'next/font/local';

// Self-hosted (assets/fonts, SIL Open Font License): the build never depends on Google
// Fonts being reachable. Each file is the variable Latin subset Google Fonts serves.

export const bricolage = localFont({
  src: '../assets/fonts/bricolage-grotesque-latin.woff2',
  weight: '700 800',
  variable: '--font-bricolage',
  display: 'swap',
});

export const instrument = localFont({
  src: '../assets/fonts/instrument-sans-latin.woff2',
  weight: '400 600',
  variable: '--font-instrument',
  display: 'swap',
});

export const jetbrains = localFont({
  src: '../assets/fonts/jetbrains-mono-latin.woff2',
  weight: '400 500',
  variable: '--font-jetbrains',
  display: 'swap',
});
