import { ImageResponse } from 'next/og';
import { DOCK_PLACEHOLDER } from '@/components/landing/copy';
import { profile } from '@/content';
import { brandFont, brandTokens } from '@/lib/brand';

// The link preview card (/og.png), rendered at build time. Same words and colors as the
// hero. A route rather than opengraph-image.tsx: the static export would write that one
// without a .png extension, and GitHub Pages serves extensionless files as binary.

export const dynamic = 'force-static';
export const OG_SIZE = { width: 1200, height: 630 };

export async function GET() {
  const [t, display, body, mono] = await Promise.all([
    brandTokens(),
    brandFont('Bricolage Grotesque'),
    brandFont('Instrument Sans'),
    brandFont('JetBrains Mono'),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: t.ground,
        color: t.ink,
        fontFamily: 'Instrument Sans',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: t.ink,
            color: t.ground,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Bricolage Grotesque',
            fontSize: 22,
          }}
        >
          {profile.monogram}
        </div>
        <div
          style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 22, color: t.muted }}
        >
          {`${profile.location.city}, ${profile.location.region}`}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Bricolage Grotesque',
            fontSize: 104,
            lineHeight: 0.95,
            letterSpacing: '-0.035em',
          }}
        >
          Hi, I’m <span style={{ color: t.accent, marginLeft: 26 }}>{profile.firstName}.</span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 30,
            lineHeight: 1.4,
            color: t.ink2,
            maxWidth: 1000,
          }}
        >
          {profile.tagline}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 84,
          padding: '0 14px 0 32px',
          borderRadius: 24,
          background: t.surface,
          border: `2px solid ${t.line}`,
          fontSize: 28,
          color: t.muted,
        }}
      >
        {DOCK_PLACEHOLDER}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: t.accent,
            color: t.accentContrast,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
          }}
        >
          ↑
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Bricolage Grotesque', data: display, weight: 800 },
        { name: 'Instrument Sans', data: body, weight: 500 },
        { name: 'JetBrains Mono', data: mono, weight: 500 },
      ],
    },
  );
}
