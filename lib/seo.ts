import type { Metadata } from 'next';
import {
  awards,
  type CaseStudy,
  education,
  experience,
  mentions,
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
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
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

/** schema.org Article for a case study, by Paul. */
export function caseStudyData(study: CaseStudy) {
  const mention = mentions.find((m) => m.caseStudyId === study.id);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: study.title,
    description: study.summary,
    url: url(`/work/${study.id}/`),
    author: { '@id': url('/#person'), '@type': 'Person', name: profile.name },
    about: experience.find((e) => e.id === study.experienceId)?.company,
    keywords: study.stack.join(', '),
    ...(mention ? { citation: mention.url } : {}),
  };
}

/** schema.org BreadcrumbList for a case study: Résumé › company › the study. */
export function breadcrumbData(study: CaseStudy) {
  const company = experience.find((e) => e.id === study.experienceId)?.company;
  const trail = [
    { name: 'Résumé', path: '/resume/' },
    ...(company ? [{ name: company, path: `/resume/#${study.experienceId}` }] : []),
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
