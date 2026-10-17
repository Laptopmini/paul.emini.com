import { ImageResponse } from 'next/og';
import { profile } from '@/content';
import { brandFont, brandTokens } from './brand';

/**
 * The PVM tile (--ink with --ground letters, like the header mark) as a PNG of `px`
 * pixels, for the favicon and the Apple touch icon. `rounded` is false for Apple, which
 * applies its own mask.
 */
export async function brandTile(px: number, { rounded = true } = {}) {
  const [t, display] = await Promise.all([brandTokens(), brandFont('Bricolage Grotesque')]);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: t.ink,
        color: t.ground,
        borderRadius: rounded ? px * 0.28 : 0,
        fontFamily: 'Bricolage Grotesque',
        fontSize: px * 0.36,
        letterSpacing: '-0.01em',
      }}
    >
      {profile.monogram}
    </div>,
    { width: px, height: px, fonts: [{ name: 'Bricolage Grotesque', data: display, weight: 800 }] },
  );
}
