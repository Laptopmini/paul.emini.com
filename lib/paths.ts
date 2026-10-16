/**
 * Prefixes a public/ asset path with the deploy base path. next/link and next/font
 * handle this on their own; plain <a href> to static files does not.
 */
export function asset(path: `/${string}`): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}
