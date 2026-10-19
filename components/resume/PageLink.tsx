import type { AnchorHTMLAttributes } from 'react';
import { asset } from '@/lib/paths';

/**
 * A link between the static pages (/resume, /work/*). A plain <a>, not next/link: a
 * full document navigation is what lets the cross-document view transition run (the
 * case-study title morphs between the résumé teaser and the page's H1).
 */
export function PageLink({
  href,
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string }) {
  return <a href={asset(href as `/${string}`)} {...rest} />;
}
