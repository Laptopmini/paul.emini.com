# paul.emini.com

My personal site and résumé, with an AI agent that answers questions about my career and replies with interactive cards instead of walls of text.

**[paul.emini.com](https://paul.emini.com)** 

The site is part of my portfolio, so the code is public. It's a static site plus one small serverless function, and it costs about **$5 a month** to run.

## What's on it

- **Landing page:** server-rendered, works with JavaScript off. Ask the agent first; the whole résumé follows below it as plain HTML, for people who'd rather read than chat and for search engines and AI crawlers. While reading, a floating button asks the agent about the section in view. (`/resume/` redirects there.)
- **[/work/unified-journey](https://paul.emini.com/work/unified-journey/):** a long-form case study.
- **The agent:** ask "What have you been up to lately?" and it answers in my voice, then shows project cards, a skills breakdown, recommendation quotes or an email draft, all rendered from the same content as the pages. Pick a persona (Friend, Recruiter, Engineer) to change the tone and depth.

## How it runs

```
Browser ──── static site ──── GitHub Pages (free)
   │
   │ AG-UI over SSE, Turnstile-backed session
   ▼
Cloudflare Worker ─ CopilotKit runtime, tools, guardrails
   │        └─ Durable Object: daily limits, provider health
   ▼
OpenRouter ─ MiniMax M3 (answers) + Ling 3.1 Flash (topic gate)
```

- **Frontend:** Next.js 16 (App Router, static export), React 19, strict TypeScript, CSS Modules on design tokens. Fonts are self-hosted, so builds never depend on a third party.
- **Agent:** a headless CopilotKit chat talking AG-UI to a Cloudflare Worker that runs the CopilotKit runtime with the Vercel AI SDK. Tools read `/content` and return ids; the chat renders the cards from the same files, so every card shows source data, never model text. Recommendation quotes are checked word for word against the source before they're shown.
- **Hosting:** the site is a static export on GitHub Pages; the agent is one Worker. There's no server, database or container to keep running.

## What it costs

| | Cost |
|---|---|
| GitHub Pages and Actions (public repo) | free |
| Cloudflare Workers Paid (the agent needs more CPU per request than the free plan allows; Durable Objects included) | $5 / month |
| OpenRouter, MiniMax M3 | about **$0.001 per question** (measured) |
| Topic gate, Ling 3.1 Flash | about $0.000003 per question |
| Turnstile, ntfy alerts | free |

A thousand questions cost about a dollar. Spending can't run away: each visitor gets 25 questions a day, the whole site 1,000, and the OpenRouter key has a hard monthly cap.

## Guardrails

- **Trust nothing from the browser:** the Worker rebuilds every request from the messages and a persona id, drops any client context, tools or system messages, and only exposes the routes the chat needs.
- **Bots:** an invisible Turnstile check, exchanged once for a signed short-lived session.
- **Limits:** per-visitor and global daily counts in a Durable Object. Visitors are counted by a keyed hash of their IP that changes daily; the IP itself is never stored. At the limit, the agent hands over to an email draft instead of calling the model.
- **Topic gate:** a cheap model screens each question in parallel with the main one; off-topic questions and jailbreaks get a canned redirect and the main run is stopped.
- **Provider health:** if OpenRouter runs out of credit or rejects the key, visitors see a resting card, the Worker retries every few minutes, and I get a push notification (ntfy) when it goes down and when it recovers, plus a daily low-credit warning.
- **Output:** the model's reasoning and provider errors never reach the browser; links in its text only point to my own site, profiles and email.

## Content

Everything the site and the agent say comes from `/content`: typed JSON and Markdown, validated with Zod at build time, so invalid content fails the build.

- **Résumé facts** are synced from a private résumé repo with a Claude Code skill (`/sync-resume`), which applies only what changed and never copies private data.
- **GitHub activity** is refreshed daily by a GitHub Action (`scripts/fetch-github.ts`): pull requests and issues on other projects, and an allow-listed set of repos with their README openings.
- **Machine-readable:** `robots.txt`, `sitemap.xml`, `llms.txt` and schema.org data, all generated from `/content`.

## Quality

- **Tests:** Vitest (unit and content), Playwright (end to end, against the Worker running a scripted model), and **agent evals** that ask the real model off-topic, jailbreak, boundary and voice questions on every push.
- **Accessibility:** axe checks on every page and card, 44 px touch targets, keyboard-only flow, reduced motion respected everywhere.
- **Performance:** Lighthouse 100 on desktop and 96+ on mobile in every category; the chat's code only loads when someone asks a question.

## Running it locally

Requires Node 24 and pnpm.

```sh
pnpm install
pnpm dev            # the site on http://localhost:3000
pnpm worker:mock    # the agent on :8787 with a scripted model (no API key)
```

For the real model: `OPENROUTER_API_KEY=… pnpm worker:dev`.

```sh
pnpm check          # Biome lint + format
pnpm typecheck
pnpm test           # unit and content tests
pnpm test:e2e       # builds the site and runs Playwright
pnpm test:evals     # agent evals, against a running `pnpm worker:dev`
pnpm build          # static export to out/
```

## Deploying

- **Site:** every push to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`). Repository variables: `AGENT_URL` (the Worker's URL) and `TURNSTILE_SITE_KEY`.
- **Agent:** `pnpm --filter worker exec wrangler deploy --env=""`. Worker secrets: `OPENROUTER_API_KEY`, `SESSION_SECRET`, `TURNSTILE_SECRET`, and optionally `NTFY_URL`.
- **CI evals:** set the repository secret `OPENROUTER_EVAL_KEY` (a separate, capped key) to run them on every push.

## Layout

```
app/          pages and generated files (résumé, case study, icons, sitemap, llms.txt)
components/   landing, résumé, chat and card components
content/      the single source of truth, with its Zod schemas
worker/       the Cloudflare Worker: runtime, tools, guardrails
shared/       the tool contract between the Worker and the chat
evals/        agent evals against the real model
scripts/      the daily GitHub fetch and build helpers
docs/         project notes: decisions and page rules
```

## License

The code is [MIT](LICENSE). These are not covered and stay all rights reserved:

- `content/`: résumé data, case studies, mentions and recommendations (quoted with their authors' permission; they belong to them)
- `public/paul.jpg` (headshot), `public/resume.pdf` and `content/resume.pdf`

The fonts in `assets/fonts/` are third-party, under the SIL Open Font License 1.1 (`OFL-*.txt` next to each font).
