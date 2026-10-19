import type { MetadataRoute } from 'next';
import { caseStudies, meta } from '@/content';
import { SITE_URL } from '@/lib/brand';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, SITE_URL).href;
  return [
    { url: url('/'), lastModified: meta.resumeSyncedAt, priority: 1 },
    { url: url('/resume/'), lastModified: meta.resumeSyncedAt, priority: 0.9 },
    ...caseStudies.map((c) => ({
      url: url(`/work/${c.id}/`),
      lastModified: meta.resumeSyncedAt,
      priority: 0.8,
    })),
  ];
}
