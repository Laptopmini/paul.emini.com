import { defineTool } from '@copilotkit/runtime/v2';
import {
  awards,
  certifications,
  education,
  experience,
  github,
  profile,
  projects,
  type Recommendation,
  site,
  skills,
} from '@/content';
import { pickExcerpt } from '@/lib/cards';
import {
  type ContactResult,
  type FollowUpsResult,
  type IdsResult,
  type RecommendationResult,
  type SkillsResult,
  type ToolError,
  toolArgs,
} from '@/shared/agent';

/** Ids for the card plus whatever facts the model needs. */
type Facts = Record<string, unknown>;

// Every tool reads /content and returns the ids its card renders plus the facts the
// model needs to talk about them. Unknown ids come back as an error listing valid ones.

function select<T extends { id: string }>(all: T[], ids: string[] | undefined): T[] | ToolError {
  if (!ids || ids.length === 0) return all;
  const found = all.filter((item) => ids.includes(item.id));
  return found.length > 0
    ? found
    : { error: `Unknown id. Valid ids: ${all.map((i) => i.id).join(', ')}` };
}

const isError = (value: unknown): value is ToolError =>
  typeof value === 'object' && value !== null && 'error' in value;

export function createTools(recommendations: Recommendation[]) {
  return [
    defineTool({
      name: 'getProfile',
      description: 'Paul’s name, title, location, contact links and profile summary.',
      parameters: toolArgs.getProfile,
      execute: async () => ({
        name: profile.name,
        title: profile.title,
        location: `${profile.location.city}, ${profile.location.region}`,
        email: profile.email,
        links: profile.links,
        summary: profile.summary,
      }),
    }),

    defineTool({
      name: 'getSkills',
      description:
        'Paul’s skills by group (renders the TopSkills card). Pass `highlight` with the skills most relevant to the question.',
      parameters: toolArgs.getSkills,
      execute: async ({ groups, highlight }): Promise<(SkillsResult & Facts) | ToolError> => {
        const selected = select(skills, groups);
        if (isError(selected)) return selected;
        const known = new Map(
          selected.flatMap((g) => g.featured).map((name) => [name.toLowerCase(), name]),
        );
        return {
          ids: selected.map((g) => g.id),
          highlight: (highlight ?? [])
            .map((h) => known.get(h.toLowerCase()))
            .filter((h): h is string => Boolean(h)),
          groups: selected.map((g) => ({ id: g.id, label: g.label, skills: g.items })),
        };
      },
    }),

    defineTool({
      name: 'getExperience',
      description:
        'Paul’s roles, most recent first. One id renders a detailed card; several render a timeline. Ids: ' +
        experience.map((e) => e.id).join(', '),
      parameters: toolArgs.getExperience,
      execute: async ({ ids, latest }): Promise<(IdsResult & Facts) | ToolError> => {
        const selected = latest ? experience.slice(0, 1) : select(experience, ids);
        if (isError(selected)) return selected;
        return {
          ids: selected.map((e) => e.id),
          roles: selected.map((e) => ({
            id: e.id,
            company: e.company,
            title: e.title,
            location: e.location,
            start: e.start,
            end: e.end ?? 'present',
            highlights: e.highlights.map((h) => `${h.label}: ${h.text}`),
            stack: e.stack,
          })),
        };
      },
    }),

    defineTool({
      name: 'getProjects',
      description: `Paul’s personal projects, most recent first. Ids: ${projects.map((p) => p.id).join(', ')}`,
      parameters: toolArgs.getProjects,
      execute: async ({ ids, recent }): Promise<(IdsResult & Facts) | ToolError> => {
        const selected = recent ? projects.slice(0, recent) : select(projects, ids);
        if (isError(selected)) return selected;
        return {
          ids: selected.map((p) => p.id),
          projects: selected.map((p) => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            date: p.date,
            summary: p.summary,
            highlights: p.highlights.map((h) => `${h.label}: ${h.text}`),
            stack: p.stack,
            repo: p.repo ? `https://github.com/${p.repo}` : null,
          })),
        };
      },
    }),

    defineTool({
      name: 'getContributions',
      description:
        'Paul’s recent public PRs and issues on repos he doesn’t own, from a daily GitHub cache.',
      parameters: toolArgs.getContributions,
      execute: async ({ limit }) => {
        const items = github.contributions.slice(0, limit ?? 5);
        return {
          ids: items.map((c) => c.url),
          fetchedAt: github.fetchedAt,
          note:
            items.length > 0
              ? undefined
              : `No recent public contributions to show. Don't mention caches or data; point to ${profile.links.github} instead.`,
          contributions: items.map(({ kind, state, title, repo, number, updatedAt }) => ({
            kind,
            state,
            title,
            repo,
            number,
            updatedAt,
          })),
        };
      },
    }),

    defineTool({
      name: 'getEducation',
      description: 'Paul’s degree and school.',
      parameters: toolArgs.getEducation,
      execute: async (): Promise<IdsResult & Facts> => ({
        ids: education.map((e) => e.id),
        education: education.map((e) => ({
          degree: e.degree,
          school: e.school,
          capstone: e.capstoneExperienceId,
        })),
      }),
    }),

    defineTool({
      name: 'getCertifications',
      description: 'Paul’s certifications and courses, newest first.',
      parameters: toolArgs.getCertifications,
      execute: async ({ ids }): Promise<(IdsResult & Facts) | ToolError> => {
        const selected = select(certifications, ids);
        if (isError(selected)) return selected;
        return {
          ids: selected.map((c) => c.id),
          certifications: selected.map(({ name, issuer, issued }) => ({ name, issuer, issued })),
        };
      },
    }),

    defineTool({
      name: 'getAwards',
      description: 'Awards Paul has received.',
      parameters: toolArgs.getAwards,
      execute: async (): Promise<IdsResult & Facts> => ({
        ids: awards.map((a) => a.id),
        awards: awards.map(({ name, issuer, received, description }) => ({
          name,
          issuer,
          received,
          description,
        })),
      }),
    }),

    defineTool({
      name: 'getRecommendations',
      description:
        'Read the full text of recommendations about Paul (no card). Follow with showRecommendation to display one.',
      parameters: toolArgs.getRecommendations,
      execute: async ({ ids }) => {
        const selected = select(recommendations, ids);
        if (isError(selected)) return selected;
        return {
          recommendations: selected.map(
            ({ id, name, title, company, relationship, date, body }) => ({
              id,
              name,
              title,
              company,
              relationship,
              date,
              body,
            }),
          ),
        };
      },
    }),

    defineTool({
      name: 'showRecommendation',
      description:
        'Display one recommendation as a card with an excerpt copied word for word from its body.',
      parameters: toolArgs.showRecommendation,
      execute: async ({ id, excerpt }): Promise<RecommendationResult | ToolError> => {
        const rec = recommendations.find((r) => r.id === id);
        if (!rec) {
          return { error: `Unknown id. Valid ids: ${recommendations.map((r) => r.id).join(', ')}` };
        }
        return { id, excerpt: pickExcerpt(rec, excerpt) };
      },
    }),

    defineTool({
      name: 'getSiteArchitecture',
      description: 'How this website and its agent were built (for "How was this site built?").',
      parameters: toolArgs.getSiteArchitecture,
      execute: async () => site,
    }),

    defineTool({
      name: 'draftContactEmail',
      description: 'Offer the visitor an editable email draft to Paul (renders the contact card).',
      parameters: toolArgs.draftContactEmail,
      execute: async ({ topicSummary }): Promise<ContactResult> => {
        // The model's topic goes in the subject, where a label reads naturally; the body
        // stays a fixed sentence the visitor edits.
        const topic = topicSummary
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/[.!]+$/, '')
          .slice(0, 120);
        return {
          email: profile.email,
          subject: topic ? `${topic} (via paul.emini.com)` : 'Hello from paul.emini.com',
          draft: 'Hi Paul — I was chatting with the agent on your site, and I’d love to talk more.',
        };
      },
    }),

    defineTool({
      name: 'suggestFollowUps',
      description: 'End every turn with 2–3 follow-up questions shown as buttons.',
      parameters: toolArgs.suggestFollowUps,
      execute: async ({ questions }): Promise<FollowUpsResult> => ({
        questions: questions
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 3),
      }),
    }),
  ];
}
