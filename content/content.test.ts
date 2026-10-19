import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  awards,
  caseStudies,
  certifications,
  education,
  experience,
  github,
  mentions,
  parseRecommendations,
  profile,
  projects,
  skills,
} from './index';
import { curatedSource } from './schema/curated';
import { toId, toIsoDate } from './schema/recommendations';

const dir = import.meta.dirname;
const recommendations = parseRecommendations(readFileSync(join(dir, 'recommendations.md'), 'utf8'));

function uniqueIds(items: { id: string }[]) {
  const ids = items.map((i) => i.id);
  expect(new Set(ids).size).toBe(ids.length);
}

describe('content', () => {
  it('ids are unique within each collection', () => {
    for (const collection of [
      skills,
      experience,
      projects,
      education,
      certifications,
      awards,
      recommendations,
      caseStudies,
      mentions,
    ]) {
      uniqueIds(collection);
    }
  });

  it('the profile title matches the résumé summary', () => {
    expect(profile.summary.startsWith(`${profile.title} `)).toBe(true);
  });

  it('curated card copy was reviewed against the current source text', () => {
    const stale = [
      ...experience.map((value) => ({ id: value.id, value, kind: 'experience' as const })),
      ...projects.map((value) => ({ id: value.id, value, kind: 'project' as const })),
      ...awards.map((value) => ({ id: value.id, value, kind: 'award' as const })),
    ]
      .map((entry) => {
        const expected = curatedSource(entry as Parameters<typeof curatedSource>[0]);
        return { entry, expected };
      })
      .filter(({ entry, expected }) => entry.value.curatedFrom !== expected)
      .map(
        ({ entry, expected }) =>
          `${entry.kind}/${entry.id}: review short/blurb/tags, then set curatedFrom to "${expected}"`,
      );
    expect(stale, stale.join('\n')).toEqual([]);
  });

  it('experience is ordered most recent first', () => {
    const starts = experience.map((e) => e.start);
    expect(starts).toEqual([...starts].sort().reverse());
  });

  it('projects are ordered most recent first', () => {
    const dates = projects.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('education references existing experience', () => {
    const ids = new Set(experience.map((e) => e.id));
    for (const e of education) {
      if (e.capstoneExperienceId) expect(ids).toContain(e.capstoneExperienceId);
    }
  });

  it('case studies and mentions reference existing entries', () => {
    const experiences = new Set(experience.map((e) => e.id));
    const studies = new Set(caseStudies.map((c) => c.id));
    for (const c of caseStudies) expect(experiences).toContain(c.experienceId);
    for (const m of mentions) {
      expect(experiences).toContain(m.experienceId);
      if (m.caseStudyId) expect(studies).toContain(m.caseStudyId);
    }
  });

  it('case study periods are in order and sections are unique', () => {
    for (const c of caseStudies) {
      expect(c.start <= c.end).toBe(true);
      uniqueIds(c.sections);
    }
  });

  // A stat's evidence is quoted from the write-up. A number must appear in its
  // evidence; a word stat ("All", "Zero") must be backed by an Impact bullet.
  it('case study stats are backed by the text', () => {
    for (const c of caseStudies) {
      const plain = (parts: string[]) => parts.join('\n').replaceAll('**', '');
      const text = plain(c.sections.flatMap((s) => [...s.paragraphs, ...s.bullets]));
      const impact = plain(c.sections.find((s) => s.id === 'impact')?.bullets ?? []);
      for (const stat of c.stats ?? []) {
        expect(text).toContain(stat.evidence);
        const number = stat.value.match(/\d+/)?.[0];
        if (number) expect(stat.evidence).toContain(number);
        else expect(impact.toLowerCase()).toContain(stat.evidence.toLowerCase());
      }
    }
  });

  it('case study credits and aside links point at existing entries', () => {
    const anchors = [...recommendations, ...experience, ...projects].map((e) => e.id);
    for (const c of caseStudies) {
      const credit = c.designCredit;
      if (credit?.recommendationId) {
        expect(recommendations.find((r) => r.id === credit.recommendationId)?.name).toBe(
          credit.name,
        );
      }
      for (const s of c.sections) {
        const anchor = s.aside?.href?.match(/^\/resume\/#(.+)$/)?.[1];
        if (anchor) expect(anchors).toContain(anchor);
      }
    }
  });

  it('recommendation highlights are verbatim sentences, one per recommendation', () => {
    const highlights = JSON.parse(
      readFileSync(join(dir, 'recommendation-highlights.json'), 'utf8'),
    );
    expect(Object.keys(highlights).sort()).toEqual(recommendations.map((r) => r.id).sort());
    for (const r of recommendations) {
      expect(r.body.replace(/\s+/g, ' ')).toContain(highlights[r.id]);
    }
  });

  it('every mention names Paul and only Paul', () => {
    // Quotes keep only Paul's name: other people credited in the same post are left out.
    const others = recommendations.map((r) => r.name);
    for (const m of mentions) {
      expect(m.quotes.join(' ')).toContain(profile.name);
      for (const name of others) expect(m.quotes.join(' ')).not.toContain(name);
    }
  });

  it('github.json holds only allow-listed and project repos', () => {
    // Privacy: job-application and generated repos never reach the site or the agent.
    const { repos: allowed } = JSON.parse(readFileSync(join(dir, 'portfolio-repos.json'), 'utf8'));
    const included = new Set(
      [...allowed, ...projects.flatMap((p) => (p.repo ? [p.repo.split('/')[1]] : []))].map(
        (n: string) => n.toLowerCase(),
      ),
    );
    for (const r of github.repos) expect(included).toContain(r.name.toLowerCase());
  });

  it('project repos belong to the profile GitHub user', () => {
    const user = new URL(profile.links.github).pathname.slice(1);
    expect(github.user).toBe(user);
    for (const p of projects) if (p.repo) expect(p.repo.split('/')[0]).toBe(user);
  });

  it('parses all four recommendations', () => {
    expect(recommendations.map((r) => r.id)).toEqual([
      'sandra-martocchia',
      'derek-warner',
      'jeanine-jue',
      'luc-julia',
    ]);
    expect(recommendations.find((r) => r.id === 'luc-julia')?.date).toBe('2018-03-23');
    expect(recommendations.every((r) => !r.body.includes('**'))).toBe(true);
  });

  it('ships the résumé PDF in content/ and public/', () => {
    const a = readFileSync(join(dir, 'resume.pdf'));
    const b = readFileSync(join(dir, '..', 'public', 'resume.pdf'));
    expect(a.subarray(0, 5).toString()).toBe('%PDF-');
    expect(a.equals(b)).toBe(true);
  });

  it('records the source commit', () => {
    expect(readFileSync(join(dir, '.source-sha'), 'utf8').trim()).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('recommendations parser', () => {
  it('converts dates and names', () => {
    expect(toIsoDate('June 1, 2026')).toBe('2026-06-01');
    expect(() => toIsoDate('06/01/2026')).toThrow();
    expect(toId('Dr. Luc Julia')).toBe('luc-julia');
  });

  it('rejects an entry with a missing field', () => {
    expect(() => parseRecommendations('## Jane Doe\n- **Title:** Eng\n\nGreat.\n')).toThrow(
      /missing \*\*Company:\*\*/,
    );
  });
});
