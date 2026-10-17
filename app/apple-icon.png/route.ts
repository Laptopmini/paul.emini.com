import { brandTile } from '@/lib/brand-tile';

// Apple touch icon (/apple-icon.png), square: iOS applies its own mask.
export const dynamic = 'force-static';

export function GET() {
  return brandTile(180, { rounded: false });
}
