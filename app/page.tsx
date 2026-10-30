import type { Metadata } from 'next';
import { ChatShell } from '@/components/ChatShell';
import { JsonLd } from '@/components/JsonLd';
import { AskButton } from '@/components/landing/AskButton';
import { AskPanel } from '@/components/landing/AskPanel';
import { Hero } from '@/components/landing/Hero';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { TimelineStrata } from '@/components/landing/TimelineStrata';
import { AskCta } from '@/components/resume/AskCta';
import { Education } from '@/components/resume/Education';
import { Highlights } from '@/components/resume/Highlights';
import layout from '@/components/resume/layout.module.css';
import { OnThisPage, type PageSection } from '@/components/resume/OnThisPage';
import { OpenOnHash } from '@/components/resume/OpenOnHash';
import { OpenSource } from '@/components/resume/OpenSource';
import { PrintExpand } from '@/components/resume/PrintExpand';
import { Projects } from '@/components/resume/Projects';
import { RecommendationCarousel } from '@/components/resume/RecommendationCarousel';
import { ResumeIntro } from '@/components/resume/ResumeIntro';
import { RoleTimeline } from '@/components/resume/RoleTimeline';
import resume from '@/components/resume/resume.module.css';
import { ScrollSpy } from '@/components/resume/ScrollSpy';
import { Skills } from '@/components/resume/Skills';
import { DEFAULT_PERSONA, github, meta, pages, personas, profile } from '@/lib/content';
import { pageMetadata, profilePageData } from '@/lib/seo';
import styles from './page.module.css';

// The landing page: the ask panel first, then the whole résumé as plain, server-rendered
// HTML, for people who'd rather read than ask and for every crawler and AI agent (none
// of which can use the chat). Same facts as the PDF and the agent: all from /content.

const description = `${profile.title} in ${profile.location.city}. Ask my agent anything, or read the full résumé: experience, projects, skills, recommendations and open-source work.`;

export const metadata: Metadata = pageMetadata({
  title: `${profile.name} · Résumé and AI agent`,
  description,
  path: '/',
  type: 'profile',
});

// Agent guidance stays server-side; the landing only needs what it shows.
const personaOptions = personas.map(({ id, label, hint, prompts }) => ({
  id,
  label,
  hint,
  prompts,
}));

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

export default function Home() {
  return (
    <ChatShell>
      <div className={styles.page}>
        <JsonLd data={profilePageData(meta.resumeSyncedAt)} />
        <SiteHeader />
        <main>
          <div className={styles.first}>
            <div className={styles.hero}>
              <Hero />
              <TimelineStrata />
            </div>
            <AskPanel personas={personaOptions} defaultPersona={DEFAULT_PERSONA} />
          </div>
          <div className={styles.wrap}>
            <ResumeIntro />
            <div className={styles.resume}>
              <OnThisPage sections={sections} variant="rail" className={styles.rail} />
              <div className={styles.tabs}>
                <OnThisPage sections={sections} variant="tabs" />
              </div>
              <div className={`${styles.sections} ${layout.resumeColumn}`}>
                <Highlights />
                <RoleTimeline />
                <Projects />
                <Skills />
                <RecommendationCarousel />
                <div className={resume.pair}>
                  <Education />
                  {hasOpenSource && <OpenSource />}
                </div>
                <AskCta />
              </div>
            </div>
          </div>
        </main>
        <AskButton
          prompts={pages.askBySection}
          personas={personaOptions}
          defaultPersona={DEFAULT_PERSONA}
        />
        <ScrollSpy />
        <OpenOnHash />
        <PrintExpand />
      </div>
    </ChatShell>
  );
}
