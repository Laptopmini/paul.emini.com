import { brandTile } from '@/lib/brand-tile';

// /favicon.ico, which browsers request at the site root whatever the <link> tags say.
// An ICO file can hold a PNG as is: a 6-byte header, one 16-byte directory entry, then
// the PNG bytes.
export const dynamic = 'force-static';

const SIZE = 48;

export async function GET() {
  const png = new Uint8Array(await (await brandTile(SIZE)).arrayBuffer());
  const ico = new Uint8Array(22 + png.length);
  const view = new DataView(ico.buffer);
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, 1, true); // one image
  ico[6] = SIZE; // width
  ico[7] = SIZE; // height
  view.setUint16(10, 1, true); // color planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, png.length, true); // image size
  view.setUint32(18, 22, true); // image offset
  ico.set(png, 22);
  return new Response(ico, { headers: { 'content-type': 'image/x-icon' } });
}
