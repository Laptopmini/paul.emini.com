import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/brand';

// Everyone may crawl, AI crawlers included: being read accurately by them is the point.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: new URL('/sitemap.xml', SITE_URL).href,
  };
}
