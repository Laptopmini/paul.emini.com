import type { Metadata } from 'next';
import {
  awards,
  caseStudies,
  certifications,
  education,
  experience,
  mentions,
  profile,
  projects,
  recommendations,
  skills,
} from '@/lib/content';
import { fixtureContributions, fixtureRepo } from './fixtures';
import { Gallery } from './Gallery';

export const metadata: Metadata = {
  title: 'Card catalogue (dev)',
  robots: { index: false, follow: false },
};

export default function CardsPage() {
  const [edu] = education;
  return (
    <Gallery
      data={{
        email: profile.email,
        skills,
        experience,
        projects,
        certifications,
        award: awards[0],
        recommendations,
        education: edu,
        capstone: experience.find((e) => e.id === edu?.capstoneExperienceId),
        contributions: fixtureContributions,
        repo: fixtureRepo,
        caseStudy: caseStudies[0],
        mention: mentions[0],
      }}
    />
  );
}
