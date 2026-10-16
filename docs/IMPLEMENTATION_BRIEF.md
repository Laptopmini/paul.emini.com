# paul.emini.com — Implementation Brief

Personal site + résumé for Paul-Valentin Mini, with an agent chat (CopilotKit / AG-UI) that answers questions about his career and renders résumé content as generative UI cards. The site's implementation is itself part of the portfolio: modern React, polished motion, clean DX.

Reference designs live in `docs/design/*.dc.html` (exported from the design canvas). They are **visual references, not production code**: they use a custom runtime (`support.js`, `<x-dc>`, `{{holes}}`) that does not exist here. Rebuild them as real React components; match layout, type, color, spacing and copy.

| Board | What it shows |
|---|---|
| `Main.dc.html` | Landing page (desktop, fluid) |
| `Chat.dc.html` | Chat session: collapsed sticky header, answers with cards, sticky input |
| `Catalogue.dc.html` | Every generative UI component + loading / resting / off-topic states |
| `Mobile.dc.html` | Chat session at 390px |

---

## 1. Locked decisions

- **Domain:** `paul.emini.com` (CNAME to the static host).
- **Phone number:** not shown on the site. It stays in the PDF only.
- **Monogram:** `PVM`. The landing header shows "Paul‑Valentin Mini" with no sublabel. In the chat header it gains the sublabel "Senior Software Developer · San Francisco".
- **Input:** text only, no attachments, `maxlength=400` with a visible counter.
- **Persona toggle:** `Friend` (default) · `Recruiter` · `Engineer`, introduced by the lead-in "Answer as if I'm a". Each persona has its own suggested prompts (below).
- **Job-fit check:** post-launch backlog, not v1.
- **LLM:** MiniMax (Paul's non-commercial subscription) as primary, behind a provider adapter. OpenRouter (dedicated key + hard spend cap) as fallback.

## 2. Stack

Verify current versions at install time; prefer latest stable.

- **Next.js (App Router), static export** (`output: 'export'`), React 19, TypeScript strict.
- **Styling:** CSS variables + CSS Modules (or Tailwind v4 if preferred; tokens must stay CSS variables either way).
- **Motion:**
  - View Transitions API for the landing → chat transition.
  - CSS scroll-driven animations (`animation-timeline: scroll()/view()`) for the parallax on the timeline cards.
  - Motion (motion.dev) for spring micro-interactions inside cards.
  - Everything is disabled under `prefers-reduced-motion`.
- **Agent:** CopilotKit React components on the frontend. The CopilotKit runtime runs in a **Cloudflare Worker** (`/worker`).
  - **Spike this first:** confirm the runtime runs on Workers.
  - Fallback hosts: Vercel Hobby or Fly.io.
- **State/quotas:** Cloudflare KV or a Durable Object for per-IP and global daily counters. Turnstile in front of the chat endpoint.
- **Tooling:** Biome (lint + format), Vitest (unit), Playwright (e2e + agent evals), GitHub Actions.
- **Hosting:**
  - Frontend on GitHub Pages (public repo) with a custom domain.
  - Alternative if CORS or deploy split becomes annoying: Cloudflare Pages for everything.

## 3. Repo structure

```
/app                    Next.js routes (single page + not-found)
/components
  /landing              Hero, ContactLinks, TimelineStrata, PersonaToggle, PromptPills, ChatDock
  /chat                 ChatHeader, MessageList, UserBubble, AgentMessage, SourceLine, FollowUps
  /cards                TopSkills, Experience (single + timeline), Project, Contributions,
                        Education, Certifications, Award, Recommendation, ContactHandoff,
                        CardSkeleton, AgentResting, OffTopicRedirect
/content                SINGLE SOURCE OF TRUTH for all résumé data (typed JSON + md)
  profile.json          name, location, email, links, summary
  skills.json
  experience.json
  projects.json
  education.json
  certifications.json
  awards.json
  recommendations.md    curated, hand-maintained (format in §5)
  github.json           generated daily by CI, do not edit
  contributions-pinned.json  optional hand-picked OSS highlights
  resume.pdf            copied from the private résumé repo
  .source-sha           commit of Laptopmini/my-resume the content was synced from
/content/schema         Zod schemas for every content file (build fails on invalid content)
/worker                 Cloudflare Worker: CopilotKit runtime, tools, guardrails, quotas
/scripts                fetch-github.ts, build helpers
/docs/design            reference boards from the design canvas
/.claude/skills/sync-resume/SKILL.md
```

The UI cards and the agent tools **both** read `/content`. Agent tools return ids; cards render the data. The model never free-writes job titles, dates or quotes.

## 4. Design system

### Tokens

```css
:root {
  --accent: #2448E5;                                                   /* the ONLY value to change */
  --accent-strong: color-mix(in oklch, var(--accent) 75%, black);
  --accent-tint:   color-mix(in oklch, var(--accent) 12%, white);
  --accent-ring:   color-mix(in oklch, var(--accent) 22%, transparent);

  --ground:  #EDEFEA;   /* page background */
  --surface: #FFFFFF;   /* cards */
  --ink:     #121614;   /* text, dark cards, user bubbles */
  --ink-2:   #2E3532;   /* body copy */
  --muted:   #4C5450;   /* meta text (passes 4.5:1 on ground) */
  --line:    #D5D9D3;   /* card borders */
  --line-2:  #C6CCC7;   /* pill borders */
  --divider: #E3E6E1;
  --chip:    #E1E4DF;   /* segmented control track */

  /* status chips (fixed, independent of accent) */
  --ok-bg: #E7F4EC;   --ok-fg: #0E6B45;    /* PR merged */
  --warn-bg: #FDEEE4; --warn-fg: #9A3A0A;  /* issue */
  /* PR open uses --accent-tint / --accent-strong */
}
```

If the accent becomes light, add `--accent-contrast` for text on the accent (send button, "Open in email").

### Type

All three faces are on Google Fonts; self-host them with `next/font`.

- **Display:** Bricolage Grotesque 700/800, tight tracking (-0.01 to -0.035em). Used for the hero, card titles and names.
- **Body:** Instrument Sans 400/500/600.
- **Meta:** JetBrains Mono 400/500 at 12–14px, for dates, labels, source lines and the char counter.

Hero size: 96px on desktop, 52px on phone.

### Shape

- Cards: 18px radius, 1px `--line` border.
- Pills: 999px radius.
- Inputs and the dock: 20px radius.
- Monogram tile: 11px radius.
- Every touch target is at least 44px.

### Interaction feedback (required everywhere)

- Contact links lift 2px on hover and get a shadow.
- Prompt pills fill with ink on hover.
- Cards rise 3px on hover, with a stronger border and a shadow.
- The "View repo" arrow nudges up and right on hover.
- Buttons scale to 0.96 when pressed. The send button scales to 1.06 on hover.
- The dock gets an accent border and `--accent-ring` glow on `:focus-within`.
- `:focus-visible` shows a 3px accent outline with a 3px offset.
- Transitions run around 180ms. Motion springs are only for card enter and leave.

## 5. Content & sync

- **Source of truth:** `resume.md` and `resume.pdf` on `main` of the private repo `Laptopmini/my-resume`, cloned locally as a sibling directory (`../my-resume`).
- **`/sync-resume` skill** (`.claude/skills/sync-resume/SKILL.md`):
  1. Read `content/.source-sha`.
  2. `git -C ../my-resume diff <sha>..origin/main -- resume.md resume.pdf`. If nothing changed, stop.
  3. Map each changed section to its JSON file and update only those entries, keeping ids stable.
  4. Copy `resume.pdf` to `content/resume.pdf` (and `public/`).
  5. Write the new SHA to `.source-sha`.
  6. Run `pnpm test:content` (Zod schemas) and the agent evals.
  7. Commit with message `content: sync résumé @ <short-sha>` and a summary of the diff.
- **Privacy:** never commit the raw `resume.md`, and never write the phone number into `/content`.
- **Recommendations** are maintained by hand in `content/recommendations.md`. Paul confirmed all four recommenders agreed to public display. Format:
  ```markdown
  ## Name
  - **Title:** …
  - **Company:** …
  - **Relationship:** …
  - **Date:** …
  - **LinkedIn:** https://…

  Full text.
  ```
  The initial file ships with this brief (`docs/recommendations.md`): Sandra Martocchia, Derek Warner, Jeanine Jue, Dr. Luc Julia. Move it to `content/recommendations.md`.

## 6. GitHub activity (daily)

- A GitHub Action on cron (daily, plus `workflow_dispatch`) runs `scripts/fetch-github.ts`, which collects:
  - **Public repos owned by Laptopmini:** name, description, created, pushed, stars, language, URL.
  - **Contributions outside his own repos:** Search API `author:Laptopmini -user:Laptopmini`, PRs (state + merged) and issues, last ~90 days.
- The script writes `content/github.json` with a `fetchedAt` timestamp. If the file changed, it commits it and the site rebuilds.
- The agent's source line shows freshness, e.g. "checked public GitHub · refreshed 6 h ago".
- `contributions-pinned.json` (optional) lets Paul pin highlights above recency.

## 7. Agent

### Tools (all read from `/content`, return ids/data for cards)

`getProfile`, `getSkills(groups?)`, `getExperience(ids? | latest?)`, `getProjects(ids? | recent?)`, `getContributions(limit?)`, `getEducation`, `getCertifications(ids?)`, `getAwards`, `getRecommendations(ids? | all?)`, `getSiteArchitecture` (powers "How was this site built?"), `draftContactEmail(topicSummary)`.

### Generative UI

Each tool has a CopilotKit render that maps to a card in `/components/cards`:

- A single Experience renders the expanded card. A list renders the timeline.
- Recommendations show an excerpt the agent picks for the question, plus a link to the full text.
- Show `CardSkeleton` while tool arguments stream in.
- Every answer ends with 2–3 follow-up pills.

### Personas

The selected persona is sent as readable state into the system prompt, and it changes depth and tone as well as the pills. Persist it per visitor in localStorage.

- **Friend:** a friendly overview. Pills: top skills · most recent experience · what have you been up to lately · what do people say about you · how was this site built
- **Recruiter:** short answers, outcomes first. Pills: 30-second summary · most recent experience · top skills · what do people say about you
- **Engineer:** depth, architecture and trade-offs. Pills: how was this site built · walk me through Ralph-node · what open source do you contribute to · zero-break NPM releases

### Voice

First person, as Paul. Concise. Never invent facts that aren't in `/content`. When unsure, say so and offer `draftContactEmail`.

### Boundaries (must hold; covered by evals)

Salary, availability or start dates, visa, personal life and opinions on past employers are all declined politely and routed to `draftContactEmail`.

Offer `draftContactEmail` proactively when the visitor:
- asks how to reach Paul
- mentions hiring, roles or rates
- has asked about 3 on-topic questions

### Misuse prevention (layered, cheapest first)

1. **Input:** text only, 400 chars, at most ~20 turns per session, a per-IP daily limit, Turnstile.
2. **Topic gate:** a cheap classification call (or embedding similarity against `/content`) before the main model. Off-topic messages get the canned `OffTopicRedirect` reply with pills, and the main model is never called.
3. **Agent:** a scoped system prompt, tool-first answers, and a max output token cap.
4. **Global daily cap:** when it's reached, show the `AgentResting` state. The rest of the site still works, and there's a browse-the-content fallback.
5. **Evals in CI:** Playwright and Vitest suites with off-topic, jailbreak and boundary prompts. The build fails on regression.

### Provider adapter

One interface with MiniMax and OpenRouter implementations, chosen by env. API keys are Worker secrets only, never in the repo or the client bundle.

## 8. Accessibility & quality bar

- Real `<button>`, `<a>`, `<label>` elements. Icon-only controls get an `aria-label`.
- Text contrast at least 4.5:1.
- The persona toggle uses `aria-pressed`.
- The chat log is an `aria-live="polite"` region.
- The landing page is fully server-rendered HTML, so it's indexable and readable with JS off.
- `prefers-reduced-motion` is respected everywhere.
- Lighthouse 95+ on all categories for the landing page.

## 9. Phases

1. **Scaffold:** Next.js static export, Biome, Vitest, Playwright, the CI workflow, a Pages deploy with the custom domain, and the design tokens.
2. **Content:** Zod schemas, the initial `/content` from the résumé, the `/sync-resume` skill, and the PDF download.
3. **Landing:** hero, contact links, timeline strata with scroll-driven parallax, persona toggle, pills, dock. Match `Main.dc.html`.
4. **Cards:** every component in `Catalogue.dc.html`, with a Storybook-like `/dev/cards` route (excluded from the production build).
5. **Worker spike, then the agent:** CopilotKit runtime on Workers, tools, personas, generative UI renders, the landing → chat view transition. Match `Chat.dc.html` and `Mobile.dc.html`.
6. **Guardrails:** topic gate, quotas, Turnstile, resting state, eval suite.
7. **GitHub job:** `fetch-github.ts` and the daily Action.
8. **Polish:** motion pass, accessibility audit, Lighthouse, OG image, favicon (PVM tile).

## 10. Backlog (post-launch)

- Job-fit check (paste a job description, get a match with honest gaps). This depends on a stronger model.
- Pinned OSS highlights UI.
- Light/dark theme.

## Placeholders still to fill

- Real repo URLs for Ragoût and Ralph-node. The boards link to the GitHub profile.
- Contribution rows on the boards are placeholders until `github.json` exists.
