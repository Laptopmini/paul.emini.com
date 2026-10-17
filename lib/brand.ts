import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Build-time helpers for the generated images (OG card, favicon, Apple touch icon).
// Satori can't read CSS variables, so the colors come straight from app/tokens.css:
// `--accent` stays the one value to change.

// A plain path, not new URL(…, import.meta.url): the bundler would treat that as a CSS import.
const TOKENS = join(process.cwd(), 'app/tokens.css');

/** The hex tokens from app/tokens.css, by name (tokens.ink is --ink). */
export async function brandTokens() {
  const css = await readFile(TOKENS, 'utf8');
  const hex = (name: string) => {
    const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{3,8})\\b`, 'i'));
    if (!match?.[1]) throw new Error(`app/tokens.css has no hex --${name}`);
    return match[1];
  };
  return {
    accent: hex('accent'),
    accentContrast: hex('accent-contrast'),
    ground: hex('ground'),
    surface: hex('surface'),
    ink: hex('ink'),
    ink2: hex('ink-2'),
    muted: hex('muted'),
    line: hex('line'),
  };
}

/** TrueType instances for Satori, which can't read the site's woff2 files. */
const TTF = {
  'Bricolage Grotesque': 'bricolage-grotesque-800.ttf',
  'Instrument Sans': 'instrument-sans-500.ttf',
  'JetBrains Mono': 'jetbrains-mono-500.ttf',
} as const;

export async function brandFont(family: keyof typeof TTF): Promise<ArrayBuffer> {
  const file = await readFile(join(process.cwd(), 'assets/fonts', TTF[family]));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

/** The site's public URL: GitHub Pages (with base path) until the custom domain is set. */
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_PATH
  ? `https://laptopmini.github.io${process.env.NEXT_PUBLIC_BASE_PATH}`
  : 'https://paul.emini.com';
