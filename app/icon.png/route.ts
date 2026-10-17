import { brandTile } from '@/lib/brand-tile';

// Favicon (/icon.png); see app/og.png/route.tsx for why these are routes.
export const dynamic = 'force-static';

export function GET() {
  return brandTile(64);
}
