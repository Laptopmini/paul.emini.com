import type { Metadata } from 'next';
import {
  awards,
  type CaseStudy,
  education,
  experience,
  mentions,
  meta,
  pages,
  profile,
  skills,
} from '@/content';
import { SITE_URL } from './brand';

// Metadata and schema.org data for search engines and AI crawlers. Everything comes from
// /content, so the machine-readable record never drifts from the page.

const OG_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: `${profile.name}, ${profile.title}`,
};

// Headshot for the Person entity only. It is never shown on the page, on purpose.
const PHOTO = { url: '/paul.jpg', width: 800, height: 800 };

/** Title, description, canonical URL and link-preview tags for one page. */
export function pageMetadata({
  title,
  description,
  path,
  type = 'website',
}: {
  title: string;
  description: string;
  path: `/${string}`;
  type?: 'website' | 'article' | 'profile';
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: profile.name,
      title,
      description,
      url: path,
      locale: 'en_US',
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
    },
  };
}

const url = (path: string) => new URL(path, SITE_URL).href;

/** schema.org Person: who Paul is, where to find him, what he knows. */
export function personData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': url('/#person'),
    name: profile.name,
    jobTitle: profile.title,
    description: profile.summary,
    image: { '@type': 'ImageObject', ...PHOTO, url: url(PHOTO.url) },
    url: url('/'),
    email: `mailto:${profile.email}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location.city,
      addressRegion: profile.location.region,
      addressCountry: 'US',
    },
    sameAs: Object.values(profile.links),
    knowsAbout: skills.flatMap((g) => g.featured),
    alumniOf: education.map((e) => ({ '@type': 'CollegeOrUniversity', name: e.school })),
    award: awards.map((a) => `${a.name}, ${a.issuer}`),
    hasOccupation: experience.map((e) => ({
      '@type': 'Occupation',
      name: e.title,
      description: `${e.company}, ${e.location}`,
    })),
  };
}

/** schema.org WebSite: the site name search engines show above the URL. */
export function websiteData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': url('/#website'),
    name: profile.name,
    alternateName: new URL(SITE_URL).host,
    url: url('/'),
    publisher: { '@id': url('/#person') },
  };
}

/** schema.org ProfilePage for the landing page, which carries the whole résumé. */
export function profilePageData() {
  const { '@context': context, ...person } = personData();
  return {
    '@context': context,
    '@type': 'ProfilePage',
    '@id': url('/#profile'),
    url: url('/'),
    isPartOf: { '@id': url('/#website') },
    dateModified: meta.resumeSyncedAt,
    mainEntity: person,
  };
}

/** schema.org Article for a case study, by Paul. */
export function caseStudyData(study: CaseStudy) {
  const mention = mentions.find((m) => m.caseStudyId === study.id);
  const company = experience.find((e) => e.id === study.experienceId)?.company;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: study.title,
    description: study.summary,
    url: url(`/work/${study.id}/`),
    image: url(OG_IMAGE.url),
    datePublished: pages.caseStudyPublished[study.id],
    // Case studies change only through /sync-resume, so the last sync bounds the last edit.
    dateModified: meta.resumeSyncedAt,
    isPartOf: { '@id': url('/#website') },
    author: { '@id': url('/#person'), '@type': 'Person', name: profile.name, url: url('/') },
    ...(company ? { about: { '@type': 'Organization', name: company } } : {}),
    keywords: study.stack.join(', '),
    ...(mention ? { citation: mention.url } : {}),
  };
}

/**
 * schema.org BreadcrumbList for a case study: Résumé › the study. Search engines ignore
 * #fragments, so a company step (`/#smartthings`) would just repeat the landing page.
 */
export function breadcrumbData(study: CaseStudy) {
  const trail = [
    { name: 'Résumé', path: '/' },
    { name: study.title, path: `/work/${study.id}/` },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: url(t.path),
    })),
  };
}
