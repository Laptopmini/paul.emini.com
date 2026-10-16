import type { AnchorHTMLAttributes } from 'react';

/** Links that leave the site open in a new tab, and say so to assistive tech. */
export function ExternalLink({
  children,
  ...rest
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'> & { href: string }) {
  return (
    <a {...rest} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** True for http(s) URLs; mailto:, tel: and site paths stay in the same tab. */
export const isExternalHref = (href: string) => /^https?:\/\//.test(href);
