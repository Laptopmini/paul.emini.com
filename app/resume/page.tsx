import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { JsonLd } from '@/components/JsonLd';
import { AskCta } from '@/components/resume/AskCta';
import { BottomBar } from '@/components/resume/BottomBar';
import { COPY } from '@/components/resume/copy';
import { Education } from '@/components/resume/Education';
import { Highlights } from '@/components/resume/Highlights';
import layout from '@/components/resume/layout.module.css';
import { OnThisPage, type PageSection } from '@/components/resume/OnThisPage';
import { OpenOnHash } from '@/components/resume/OpenOnHash';
import { OpenSource } from '@/components/resume/OpenSource';
import { PageTop } from '@/components/resume/PageTop';
import { PrintExpand } from '@/components/resume/PrintExpand';
import { Projects } from '@/components/resume/Projects';
import { RecommendationCarousel } from '@/components/resume/RecommendationCarousel';
import { ResumeHero } from '@/components/resume/ResumeHero';
import { RoleTimeline } from '@/components/resume/RoleTimeline';
import styles from '@/components/resume/resume.module.css';
import { ScrollSpy } from '@/components/resume/ScrollSpy';
import { Skills } from '@/components/resume/Skills';
import { github, profile, RESUME_PDF } from '@/lib/content';
import { pageMetadata, personData } from '@/lib/seo';

// The whole résumé as plain, server-rendered HTML, for people who'd rather read than
// ask and for every crawler and AI agent (none of which can use the chat). Same facts
// as the PDF and the agent: all of it comes from /content.

export const metadata: Metadata = pageMetadata({
  title: `Résumé · ${profile.name}`,
  description: `${profile.title} in ${profile.location.city}: experience, projects, skills, recommendations and open-source work.`,
  path: '/resume/',
  type: 'profile',
});

const hasOpenSource = github.contributions.length > 0;

const sections: PageSection[] = [
  { id: 'highlights', label: 'Highlights' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'education', label: 'Education' },
  ...(hasOpenSource ? [{ id: 'open-source', label: 'Open source' }] : []),
];

export default function ResumePage() {
  return (
    <div className={layout.page}>
      <JsonLd data={personData()} />
      <PageTop current="resume">
        <OnThisPage sections={sections} variant="tabs" />
      </PageTop>
      <main className={layout.wrap}>
        <ResumeHero />
        <div className={layout.cols}>
          <OnThisPage sections={sections} variant="rail" />
          <div className={layout.content}>
            <Highlights />
            <RoleTimeline />
            <Projects />
            <Skills />
            <RecommendationCarousel />
            <div className={styles.pair}>
              <Education />
              {hasOpenSource && <OpenSource />}
            </div>
            <AskCta />
          </div>
        </div>
      </main>
      <BottomBar>
        <a
          href={RESUME_PDF}
          download={`${profile.name.replaceAll(' ', '-')}-Resume.pdf`}
          className={layout.ghost}
        >
          <Icon name="download" size={16} /> {COPY.downloadPdf}
        </a>
        <Link href="/" className={layout.primary}>
          {COPY.askAgent}
        </Link>
      </BottomBar>
      <ScrollSpy />
      <OpenOnHash />
      <PrintExpand />
    </div>
  );
}
