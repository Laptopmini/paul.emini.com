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

/**
 * A Google font as TTF for Satori (it doesn't read woff2). An old user agent makes the
 * CSS API answer with TrueType URLs.
 */
export async function googleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}`;
  const css = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/4.0' } })).text();
  const src = css.match(/src: url\((https:[^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!src) throw new Error(`No TrueType source for ${family} ${weight}`);
  return (await fetch(src)).arrayBuffer();
}

/** The site's public URL: GitHub Pages (with base path) until the custom domain is set. */
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_PATH
  ? `https://laptopmini.github.io${process.env.NEXT_PUBLIC_BASE_PATH}`
  : 'https://paul.emini.com';
