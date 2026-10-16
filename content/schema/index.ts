import { z } from 'zod';

// Zod schemas for every file in /content. Invalid content fails `pnpm test:content`,
// which runs before every build. Card-facing copy (`short`, `blurb`, `tags`) is curated
// here so the agent never has to paraphrase résumé facts itself.

export const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case id');
export const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM');
export const isoDate = z.iso.date();
const text = z.string().trim().min(1);
const httpsUrl = z.url({ protocol: /^https$/ });

export const profileSchema = z.strictObject({
  name: text,
  firstName: text,
  monogram: z.string().regex(/^[A-Z]{2,4}$/),
  title: text,
  location: z.strictObject({ city: text, region: text }),
  email: z.email(),
  links: z.strictObject({ linkedin: httpsUrl, github: httpsUrl }),
  /** Hero lede, rendered after `title`: "<title> <tagline>". Keep the title out of it. */
  tagline: text.refine((t) => /^[a-z]/.test(t), 'starts lowercase; the title precedes it'),
  /** Profile paragraph from the résumé. */
  summary: text,
});

export const skillGroupSchema = z
  .strictObject({
    id,
    label: text,
    items: z.array(text).min(1),
    /** Subset of `items` shown on the TopSkills card, in display order. */
    featured: z.array(text).min(1),
  })
  .refine((g) => g.featured.every((s) => g.items.includes(s)), {
    message: 'featured skills must be listed in items',
    path: ['featured'],
  });
export const skillsSchema = z.array(skillGroupSchema).min(1);

export const highlightSchema = z.strictObject({
  label: text,
  text,
  /** Condensed bullet for the expanded Experience card. */
  short: text,
});

export const experienceSchema = z
  .strictObject({
    id,
    company: text,
    /** Compact name for tight spots (landing timeline). Several entries may share one. */
    shortName: text.optional(),
    location: text,
    title: text,
    start: yearMonth,
    /** null = current role. */
    end: yearMonth.nullable(),
    highlights: z.array(highlightSchema).min(1),
    stack: z.array(text).min(1),
    /** Chips shown on the card. */
    tags: z.array(text).min(1).max(6),
    /** Fingerprint of the source fields the curated copy was reviewed against (see curated.ts). */
    curatedFrom: z.string().regex(/^[0-9a-f]{8}$/),
  })
  .refine((e) => e.end === null || e.start <= e.end, {
    message: 'start must not be after end',
    path: ['end'],
  });
export const experiencesSchema = z.array(experienceSchema).min(1);

export const projectSchema = z.strictObject({
  id,
  name: text,
  kind: text,
  /** Short descriptor under the name, e.g. "AI development pipeline". */
  tagline: text,
  date: yearMonth,
  /** One-line card description. */
  blurb: text,
  summary: text,
  highlights: z.array(z.strictObject({ label: text, text })).min(1),
  stack: z.array(text).min(1),
  tags: z.array(text).min(1).max(6),
  /** Fingerprint of the source fields the curated copy was reviewed against (see curated.ts). */
  curatedFrom: z.string().regex(/^[0-9a-f]{8}$/),
  /** "owner/name" on GitHub; joins github.json for stars and last push. */
  repo: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/)
    .optional(),
});
export const projectsSchema = z.array(projectSchema).min(1);

export const educationSchema = z.strictObject({
  id,
  degree: text,
  school: text,
  schoolShort: text.optional(),
  /** Experience id of the capstone partnership, if any. */
  capstoneExperienceId: id.optional(),
});
export const educationsSchema = z.array(educationSchema).min(1);

export const certificationSchema = z.strictObject({
  id,
  name: text,
  issuer: text,
  issued: yearMonth,
});
export const certificationsSchema = z.array(certificationSchema);

export const awardSchema = z.strictObject({
  id,
  name: text,
  issuer: text,
  received: yearMonth,
  description: text,
  /** One-line card description. */
  blurb: text,
  /** Fingerprint of the source fields the curated copy was reviewed against (see curated.ts). */
  curatedFrom: z.string().regex(/^[0-9a-f]{8}$/),
});
export const awardsSchema = z.array(awardSchema);

export const recommendationSchema = z.strictObject({
  id,
  name: text,
  title: text,
  company: text,
  relationship: text,
  date: isoDate,
  linkedin: httpsUrl,
  /** Full text, paragraphs separated by blank lines. */
  body: text,
});
export const recommendationsSchema = z.array(recommendationSchema).min(1);

export const personaIds = ['visitor', 'recruiter', 'engineer'] as const;
export const personaIdSchema = z.enum(personaIds);
export const personasSchema = z
  .array(
    z.strictObject({
      id: personaIdSchema,
      label: text,
      /** Shown next to the toggle. */
      hint: text,
      /** Suggested prompt pills, in display order. */
      prompts: z.array(text.max(60)).min(2).max(5),
    }),
  )
  .refine((list) => personaIds.every((id) => list.some((p) => p.id === id)), {
    message: 'every persona needs an entry',
  });

const githubRepoSchema = z.strictObject({
  name: text,
  description: z.string().nullable(),
  url: httpsUrl,
  language: z.string().nullable(),
  stars: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  pushedAt: z.iso.datetime(),
});

const githubContributionSchema = z.strictObject({
  kind: z.enum(['pr', 'issue']),
  state: z.enum(['open', 'closed', 'merged']),
  title: text,
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  number: z.number().int().positive(),
  url: httpsUrl,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  comments: z.number().int().nonnegative().optional(),
  additions: z.number().int().nonnegative().optional(),
  deletions: z.number().int().nonnegative().optional(),
});

/** Generated daily by CI (scripts/fetch-github.ts). `fetchedAt` is null until the first run. */
export const githubSchema = z.strictObject({
  fetchedAt: z.iso.datetime().nullable(),
  user: text,
  repos: z.array(githubRepoSchema),
  contributions: z.array(githubContributionSchema),
});

/** Optional hand-picked OSS highlights, shown above recency. */
export const contributionsPinnedSchema = z.array(
  z.strictObject({ url: httpsUrl, note: text.optional() }),
);

export type Profile = z.infer<typeof profileSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Award = z.infer<typeof awardSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type Persona = z.infer<typeof personasSchema>[number];
export type PersonaId = z.infer<typeof personaIdSchema>;
export type GitHubActivity = z.infer<typeof githubSchema>;
