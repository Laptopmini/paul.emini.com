'use client';

import { type ReactNode, useState } from 'react';
import {
  AgentResting,
  Award,
  CardEnter,
  CardSkeleton,
  Certifications,
  ContactHandoff,
  Contributions,
  Education,
  ExperienceCard,
  ExperienceTimeline,
  OffTopicRedirect,
  ProjectCard,
  Recommendation,
  TopSkills,
} from '@/components/cards';
import type {
  Award as AwardEntry,
  Certification,
  Education as EducationEntry,
  Experience,
  GitHubActivity,
  Project,
  Recommendation as RecommendationEntry,
  SkillGroup,
} from '@/content';
import type { Contribution } from '@/lib/cards';
import { FIXTURE_NOW } from './fixtures';
import styles from './gallery.module.css';

type Data = {
  email: string;
  skills: SkillGroup[];
  experience: Experience[];
  projects: Project[];
  certifications: Certification[];
  award?: AwardEntry;
  recommendations: RecommendationEntry[];
  education?: EducationEntry;
  capstone?: Experience;
  contributions: Contribution[];
  repo: GitHubActivity['repos'][number];
};

function Slot({
  label,
  note,
  wide,
  children,
}: {
  label: string;
  note?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={wide ? `${styles.slot} ${styles.wide}` : styles.slot}>
      <h2 className={styles.label}>{label}</h2>
      {children}
      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}

export function Gallery({ data }: { data: Data }) {
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const details = data.experience.find((e) => e.id === detailsId) ?? data.experience[0];
  const luc = data.recommendations.find((r) => r.id === 'luc-julia') ?? data.recommendations[0];
  const ralph = data.projects.find((p) => p.id === 'ralph-node');

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.label}>Dev only · excluded from the production build</p>
          <h1 className={styles.h1}>Components the agent can render</h1>
        </div>
        <p className={styles.intro}>
          Each card is fed by a typed tool that returns ids; the data comes from /content. GitHub
          rows use fixtures until github.json is populated.
        </p>
      </header>

      <div className={styles.grid}>
        <Slot
          label="<TopSkills groups highlight />"
          note="Dark chips = skills the agent highlights for the question."
          wide
        >
          <TopSkills
            groups={data.skills}
            highlight={[
              'React',
              'Next.js',
              'TypeScript',
              'Prompt Engineering',
              'Generative UI (AG-UI)',
            ]}
          />
        </Slot>

        {data.education && (
          <Slot label="<Education />">
            <Education education={data.education} capstone={data.capstone} />
          </Slot>
        )}

        <Slot
          label='<Experience variant="timeline" />'
          note="Details opens the expanded card below (the agent does this in chat)."
          wide
        >
          <ExperienceTimeline items={data.experience} onDetails={setDetailsId} />
        </Slot>

        <Slot label="<Certifications />">
          <Certifications items={data.certifications} />
        </Slot>

        {details && (
          <Slot label="<Experience id />" wide>
            <CardEnter key={details.id}>
              <ExperienceCard experience={details} />
            </CardEnter>
          </Slot>
        )}

        {ralph && (
          <Slot label='<Project id="ralph-node" /> + GitHub cache' note="Repo stats are fixtures.">
            <ProjectCard project={ralph} repo={data.repo} />
          </Slot>
        )}

        <Slot label="<Projects />" note="As rendered in chat, before the GitHub cache exists." wide>
          <div className={styles.pair}>
            {data.projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </Slot>

        {data.award && (
          <Slot label="<Award />">
            <Award award={data.award} />
          </Slot>
        )}

        {luc && (
          <Slot
            label="<Recommendation id excerpt />"
            note="Excerpts must be verbatim; anything else falls back to the first sentence."
          >
            <Recommendation
              recommendation={luc}
              excerpt="Responding to our rapid innovation, he always managed to provide elegant solutions to hard engineering and user experience problems."
            />
          </Slot>
        )}

        <Slot label="loading state" note="Shown while tool arguments stream in.">
          <CardSkeleton />
        </Slot>

        <Slot label="<ContactHandoff />">
          <ContactHandoff
            email={data.email}
            draft="Hi Paul — I was reading about Ragoût and your generative UI work, and I’d love to chat about a frontend + AI role on our team…"
          />
        </Slot>

        <Slot label="agent resting (quota reached)">
          <AgentResting
            email={data.email}
            browse={[
              { label: 'Experience', href: '#experience' },
              { label: 'Projects', href: '#projects' },
              { label: 'Skills', href: '#skills' },
            ]}
          />
        </Slot>

        <Slot
          label="<Contributions items />"
          note="Status is shown in text as well as color. Each row links to the PR or issue."
          wide
        >
          <Contributions items={data.contributions} now={FIXTURE_NOW} />
        </Slot>

        <Slot
          label="off-topic redirect (no model call)"
          note={picked ? `Picked: ${picked}` : undefined}
        >
          <OffTopicRedirect
            onPick={setPicked}
            suggestions={[
              { label: 'Top skills', prompt: 'What are your top skills?' },
              { label: 'Recent work', prompt: 'What have you been up to lately?' },
              { label: 'Contact Paul', prompt: 'How can I reach Paul?' },
            ]}
          />
        </Slot>

        <Slot label="<CardEnter /> spring" note="Disabled under prefers-reduced-motion.">
          <button type="button" className={styles.replay} onClick={() => setReplay((n) => n + 1)}>
            Replay enter
          </button>
          <CardEnter key={replay}>
            <Contributions items={[]} now={FIXTURE_NOW} />
          </CardEnter>
        </Slot>
      </div>
    </main>
  );
}
