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
  /** Hand-curated "Focus" line in the /resume "At a glance" card. */
  focus: z.array(text).min(1).max(5),
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
    /** Gloss after the title on a collapsed /resume role; falls back to the first highlight's `short`. */
    oneLiner: text.optional(),
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
  highlights: z
    .array(
      z.strictObject({
        label: text,
        text,
        /** Gloss after the label in the /resume project list. */
        short: text.optional(),
      }),
    )
    .min(1),
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
/** Site copy: one sentence per recommendation, copied word for word, shown above the full text on /resume. */
export const recommendationHighlightsSchema = z.record(id, text);

const figureSchema = z.strictObject({
  /** Picks the figure's layout on /work/<id>. */
  kind: z.enum(['architecture', 'before-after', 'rollout']),
  caption: text.optional(),
  /** Columns (architecture), cards (before-after) or stages (rollout), in order. */
  panels: z
    .array(
      z.strictObject({
        kicker: text.optional(),
        title: text.optional(),
        note: text.optional(),
        items: z.array(z.strictObject({ label: text, note: text.optional() })).optional(),
      }),
    )
    .min(1),
});

/**
 * Long-form write-ups of one piece of work, synced from my-resume `case-studies/*.md`
 * (owner-written portfolio copy, carried over word for word). Paragraphs and bullets
 * may use **bold**. Stats, asides and figures are synced too; prose stays the record.
 */
export const caseStudySchema = z.strictObject({
  id,
  title: text,
  experienceId: id,
  role: text,
  start: yearMonth,
  end: yearMonth,
  stack: z.array(text).min(1),
  summary: text,
  /** Stat tiles, in order; the last one is drawn inverted. */
  stats: z
    .array(
      z.strictObject({
        label: text,
        /** Label on phones and on the /resume teaser. */
        shortLabel: text.optional(),
        value: text,
        /** Words from the sections that back the stat, verbatim (a content test checks it). */
        evidence: text,
        /** Also shown on the /resume teaser. */
        teaser: z.boolean().optional(),
      }),
    )
    .optional(),
  designCredit: z.strictObject({ name: text, recommendationId: id.optional() }).optional(),
  sections: z
    .array(
      z.strictObject({
        id,
        heading: text,
        /** Shorter label in the "On this page" rail. */
        navLabel: text.optional(),
        paragraphs: z.array(text),
        bullets: z.array(text),
        aside: z
          .strictObject({
            kicker: text,
            title: text.optional(),
            text,
            href: z.string().startsWith('/').optional(),
            linkLabel: text.optional(),
          })
          .refine((a) => !a.href === !a.linkLabel, 'href and linkLabel go together')
          .optional(),
        figure: figureSchema.optional(),
      }),
    )
    .min(1),
});
export const caseStudiesSchema = z.array(caseStudySchema);

/**
 * Public credits in someone else's post, synced from my-resume `mentions.md`. Not
 * recommendations: the agent says "named in", never "recommended by". Quotes are
 * verbatim; "…" marks text left out (other people's names).
 */
export const mentionSchema = z.strictObject({
  id,
  author: text,
  authorTitle: text,
  date: isoDate,
  url: httpsUrl,
  quotes: z.array(text).min(1),
  experienceId: id,
  caseStudyId: id.optional(),
});
export const mentionsSchema = z.array(mentionSchema);

export const personaIds = ['visitor', 'recruiter', 'engineer'] as const;
export const personaIdSchema = z.enum(personaIds);
export const personasSchema = z
  .array(
    z.strictObject({
      id: personaIdSchema,
      label: text,
      /** Shown next to the toggle. */
      hint: text,
      /** Tone and depth instructions for the agent (server-side system prompt only). */
      guidance: text,
      /** Suggested prompt pills, in display order. */
      prompts: z.array(text.max(60)).min(2).max(5),
    }),
  )
  .refine((list) => personaIds.every((id) => list.some((p) => p.id === id)), {
    message: 'every persona needs an entry',
  });

/** Powers "How was this site built?" (getSiteArchitecture). Describe only what exists. */
export const siteSchema = z.strictObject({
  summary: text,
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  sections: z.array(z.strictObject({ id, label: text, points: z.array(text).min(1) })).min(1),
});

/** Settings for the static pages (/resume, /work/<id>). Not résumé content. */
export const pagesSchema = z.strictObject({
  /** Recommendation carousel autoplay interval. */
  carouselIntervalMs: z.number().int().min(4000).max(15000),
  /** GitHub owner → name shown in the "At a glance" open-source line. */
  ossDisplayNames: z.record(z.string(), text),
});

/** Bookkeeping written by /sync-resume. */
export const metaSchema = z.strictObject({ resumeSyncedAt: isoDate });

const githubRepoSchema = z.strictObject({
  name: text,
  description: z.string().nullable(),
  url: httpsUrl,
  language: z.string().nullable(),
  stars: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  pushedAt: z.iso.datetime(),
  /** Opening of the README, as plain text (portfolio repos only). */
  readme: text.optional(),
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

/**
 * Owned repos shown as projects beyond the curated ones (by name). Only these and the
 * curated projects' repos are fetched into github.json: others (job applications,
 * generated demos) never appear on the site or reach the agent.
 */
export const portfolioReposSchema = z.strictObject({ repos: z.array(text) });

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
export type Site = z.infer<typeof siteSchema>;
export type Pages = z.infer<typeof pagesSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type CaseStudy = z.infer<typeof caseStudySchema>;
export type Mention = z.infer<typeof mentionSchema>;
export type GitHubActivity = z.infer<typeof githubSchema>;
