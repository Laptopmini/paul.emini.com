import { z } from 'zod';

export { AGENT_ID, MAX_PROMPT_LENGTH } from './constants';

// Contract between the Worker (tool implementations) and the chat UI (card renderers).
// Tools return ids plus facts for the model; cards look the ids up in /content.

const ids = z.array(z.string()).max(10).optional();

export const toolArgs = {
  getProfile: z.object({}),
  getSkills: z.object({
    groups: ids.describe('Skill group ids to show; omit for all groups.'),
    highlight: z
      .array(z.string())
      .max(8)
      .optional()
      .describe('Skill names most relevant to the question, exactly as listed by the tool.'),
  }),
  getExperience: z.object({
    ids: ids.describe('Experience ids; one id shows the detailed card, several show a timeline.'),
    latest: z.boolean().optional().describe('Only the most recent role.'),
  }),
  getProjects: z.object({
    ids: ids.describe('Project ids; omit for all.'),
    recent: z.number().int().min(1).max(5).optional().describe('The N most recent projects.'),
  }),
  getContributions: z.object({
    limit: z.number().int().min(1).max(10).optional(),
  }),
  getCaseStudy: z.object({
    id: z.string().optional().describe('Case study id; omit for the only/most recent one.'),
  }),
  getEducation: z.object({}),
  getCertifications: z.object({ ids }),
  getAwards: z.object({}),
  getRecommendations: z.object({ ids }),
  showRecommendation: z.object({
    id: z.string(),
    excerpt: z
      .string()
      .max(400)
      .describe('One or two sentences copied word for word from the recommendation body.'),
  }),
  getSiteArchitecture: z.object({}),
  draftContactEmail: z.object({
    topicSummary: z
      .string()
      .max(160)
      .describe(
        'What the visitor wants to discuss, as a short email subject in their words, e.g. "Senior frontend role" or "Your generative UI work".',
      ),
  }),
  suggestFollowUps: z.object({
    questions: z
      .array(z.string().max(120))
      .min(2)
      .max(3)
      .describe(
        'Questions the visitor could ask you next, written as the visitor speaking to you, e.g. "What was your most recent role?". Each is about Paul: never about the visitor, their company or role, and never an offer ("Want to know…?").',
      ),
  }),
} as const;

export type ToolName = keyof typeof toolArgs;
export type ToolArgs<T extends ToolName> = z.infer<(typeof toolArgs)[T]>;

/** Tool results always carry the ids the card should render (when it renders one). */
export type IdsResult = { ids: string[] };
export type SkillsResult = IdsResult & { highlight: string[] };
export type RecommendationResult = { id: string; excerpt: string };
export type ContactResult = { email: string; subject: string; draft: string };
export type CaseStudyResult = { id: string };
export type FollowUpsResult = { questions: string[] };
export type ToolError = { error: string };

/** Tools whose cards are sourced from the résumé vs. the daily GitHub cache. */
export const GITHUB_TOOLS: ToolName[] = ['getContributions'];
export const RESUME_TOOLS: ToolName[] = [
  'getProfile',
  'getSkills',
  'getExperience',
  'getProjects',
  'getCaseStudy',
  'getEducation',
  'getCertifications',
  'getAwards',
  'getRecommendations',
  'showRecommendation',
];

/**
 * Cards the Worker sends on its own, without calling the model (guardrails). They travel
 * as tool calls so the chat renders them like any card, and are stripped from the
 * history before it reaches the model.
 */
export const CANNED_TOOLS = ['offTopicRedirect', 'agentResting'] as const;
export type CannedTool = (typeof CANNED_TOOLS)[number];
export type OffTopicResult = Record<string, never>;
export type RestingResult = { reason: 'busy' | 'unavailable' };

/** AG-UI CUSTOM event the Worker sends with every run: the visitor's questions left today. */
export const QUOTA_EVENT = 'quota';
export type QuotaValue = { remaining: number; limit: number; resetsAt: string };

/** Header carrying the session the Worker issues after a Turnstile check. */
export const SESSION_HEADER = 'x-agent-session';
