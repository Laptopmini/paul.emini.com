'use client';

import { defineToolCallRenderer } from '@copilotkit/react-core/v2';
import type { ReactElement } from 'react';
import {
  Award,
  CardEnter,
  CardSkeleton,
  Certifications,
  ContactHandoff,
  Contributions,
  Education,
  ExperienceCard,
  ExperienceTimeline,
  ProjectCard,
  Recommendation,
  TopSkills,
} from '@/components/cards';
import {
  awards,
  certifications,
  education,
  experience,
  github,
  projects,
  recommendations,
  skills,
} from '@/content';
import {
  type ContactResult,
  type FollowUpsResult,
  type IdsResult,
  type RecommendationResult,
  type SkillsResult,
  type ToolName,
  toolArgs,
} from '@/shared/agent';
import { useChatActions } from './ChatActions';
import styles from './chat.module.css';
import { FollowUps } from './FollowUps';

// Tool call → card. Tools return ids; the cards look the data up in /content, so what a
// visitor sees always comes from the source files, never from model text.

function parse<T>(result: string | undefined): T | null {
  if (!result) return null;
  try {
    const value = JSON.parse(result) as T & { error?: string };
    return value && typeof value === 'object' && !('error' in value) ? value : null;
  } catch {
    return null;
  }
}

const byIds = <T extends { id: string }>(all: T[], ids: string[]) =>
  ids.map((id) => all.find((item) => item.id === id)).filter((item): item is T => Boolean(item));

type Props = { status: unknown; result?: string };

/** Skeleton while arguments stream in, the card on completion, nothing on errors. */
function card<T>(name: ToolName, view: (data: T) => ReactElement | null, skeleton = true) {
  return defineToolCallRenderer({
    name,
    args: toolArgs[name],
    render: ({ status, result }: Props) => {
      if (String(status) !== 'complete') return skeleton ? <CardSkeleton /> : null;
      const data = parse<T>(result);
      const element = data ? view(data) : null;
      return element ? <CardEnter>{element}</CardEnter> : null;
    },
  });
}

function ExperienceResult({ ids }: IdsResult) {
  const { ask } = useChatActions();
  const roles = byIds(experience, ids);
  const [only] = roles;
  if (roles.length === 1 && only) return <ExperienceCard experience={only} />;
  return roles.length > 0 ? (
    <ExperienceTimeline
      items={roles}
      onDetails={(id) => {
        const role = experience.find((e) => e.id === id);
        if (role) ask(`Tell me more about your time at ${role.company}`);
      }}
    />
  ) : null;
}

function FollowUpsCard({ questions }: FollowUpsResult) {
  const { ask, busy } = useChatActions();
  return <FollowUps questions={questions} onPick={ask} disabled={busy} />;
}

export const renderers = [
  card<SkillsResult>('getSkills', ({ ids, highlight }) => {
    const groups = byIds(skills, ids);
    return groups.length > 0 ? <TopSkills groups={groups} highlight={highlight} /> : null;
  }),
  card<IdsResult>('getExperience', (data) => <ExperienceResult {...data} />),
  card<IdsResult>('getProjects', ({ ids }) => {
    const list = byIds(projects, ids);
    const repos = new Map(github.repos.map((r) => [r.name.toLowerCase(), r]));
    return list.length > 0 ? (
      <div className={styles.cardGrid}>
        {list.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            repo={p.repo ? repos.get(p.repo.split('/')[1]?.toLowerCase() ?? '') : undefined}
          />
        ))}
      </div>
    ) : null;
  }),
  card<IdsResult>('getContributions', ({ ids }) => (
    <Contributions
      items={github.contributions.filter((c) => ids.includes(c.url))}
      now={new Date()}
    />
  )),
  card<IdsResult>('getEducation', ({ ids }) => {
    const [entry] = byIds(education, ids);
    if (!entry) return null;
    const capstone = experience.find((e) => e.id === entry.capstoneExperienceId);
    return <Education education={entry} capstone={capstone} />;
  }),
  card<IdsResult>('getCertifications', ({ ids }) => {
    const list = byIds(certifications, ids);
    return list.length > 0 ? <Certifications items={list} /> : null;
  }),
  card<IdsResult>('getAwards', ({ ids }) => {
    const list = byIds(awards, ids);
    return list.length > 0 ? (
      <div className={styles.cardGrid}>
        {list.map((a) => (
          <Award key={a.id} award={a} />
        ))}
      </div>
    ) : null;
  }),
  card<RecommendationResult>('showRecommendation', ({ id, excerpt }) => {
    const rec = recommendations.find((r) => r.id === id);
    return rec ? <Recommendation recommendation={rec} excerpt={excerpt} /> : null;
  }),
  card<ContactResult>('draftContactEmail', ({ email, draft, subject }) => (
    <ContactHandoff email={email} draft={draft} subject={subject} />
  )),
  card<FollowUpsResult>('suggestFollowUps', (data) => <FollowUpsCard {...data} />, false),
  // Data-only tools: the model reads them; nothing to show.
  card('getProfile', () => null, false),
  card('getRecommendations', () => null, false),
  card('getSiteArchitecture', () => null, false),
  defineToolCallRenderer({ name: '*', render: () => null }),
];
