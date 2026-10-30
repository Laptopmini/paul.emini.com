# Project notes

Decisions and context that the code, `README.md` and `CLAUDE.md` don't record. The implementation briefs, design boards and handoffs this site was built from are retired: the code is now the reference, and `/dev/cards` (dev only) shows every card and state.

## Locked decisions

- Domain `paul.emini.com`. Monogram `PVM`. The landing header shows "Paul‑Valentin Mini" with no sublabel; the chat header adds "Senior Software Developer · San Francisco".
- Chat input is text only (no attachments), 400 characters, with a visible counter.
- Persona toggle: `Friend` (default) · `Recruiter` · `Engineer`, introduced by "Answer as if I’m a". The choice persists per visitor and changes the agent's tone and depth as well as the suggested prompts.
- All four recommenders (Sandra Martocchia, Derek Warner, Jeanine Jue, Dr. Luc Julia) agreed to public display of their recommendations.
- No `Review` or `AggregateRating` schema for the recommendations: Google treats reviews about yourself as self-serving, so they're ineligible.

## `content/recommendations.md` format

Maintained by hand, never by `/sync-resume`:

```markdown
## Name
- **Title:** …
- **Company:** …
- **Relationship:** …
- **Date:** …
- **LinkedIn:** https://…

Full text.
```

## Page rules

- `/` is the landing and the whole résumé. Every word is in the initial HTML: collapsed roles are native `<details>`, carousel slides are server-rendered `<figure>`s, nothing is fetched or created on the client. Check with JS off.
- Chat cards, the Worker's tools and prompt, `llms.txt` and the case study link to `/#<experienceId>`, `/#<projectId>`, `/#<recommendationId>` and `#repo-*`. Keep those ids stable. `/resume/` is a static redirect to `/#resume`.
- Scroll-driven motion lives inside `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`, and content is fully visible without it. Anchor targets (section headings) fade in but never move: a translating heading makes anchor jumps land under the sticky header.
- The "Rather read?" arrow hops until the visitor scrolls or interacts, and only ever stops or holds at rest (the 40–100% rest of each cycle), never mid-air.
- Short screens show fewer suggested prompts (`PromptPills.module.css`) so the dock and "Rather read?" fit the first screen. Every prompt still works when typed.

## Design system follow-ups

The "paul.emini.com" design system on the design canvas predates the landing + résumé merge. Still to add:

- the ask button (hidden, section label, back to chat) and its small chat box;
- the "Latest on GitHub" timeline row (every timeline row now uses the same light card);
- the "Rather read? My résumé is right below" link with its hopping arrow;
- the lead-in text style (display 30 / 700).

Its README should say that the landing is no longer a single viewport, `/resume` is retired, and the header is 76px and sticky.

## Backlog

- Job-fit check: paste a job description, get a match with honest gaps. Needs a stronger model.
- A UI for pinned open-source highlights.
- Light/dark theme.
