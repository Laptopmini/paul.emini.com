'use client';

import { useEffect } from 'react';

/**
 * A link to a collapsed role (/resume/#prism) opens it: on load and on hash change, the
 * <details> inside the target opens. The content is in the HTML either way.
 */
export function OpenOnHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const details = id ? document.getElementById(id)?.querySelector('details') : null;
      if (details && !details.open) details.open = true;
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);

  return null;
}
