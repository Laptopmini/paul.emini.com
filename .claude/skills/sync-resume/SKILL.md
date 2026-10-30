---
name: sync-resume
description: Pull résumé changes from the private ../my-resume repo into /content. Use when the owner says "sync the résumé", "/sync-resume", "update the site from my résumé", or mentions that resume.md or resume.pdf changed in my-resume.
---

# sync-resume

`resume.md`, `resume.pdf`, `case-studies/*.md` and `mentions.md` on `main` of `Laptopmini/my-resume` (cloned at `../my-resume`) are the source of truth for the career content in `/content`. This skill applies only what changed since the last sync and keeps ids stable, so cards, agent tools and evals keep pointing at the same entries.

## Hard rules

- **Never copy `resume.md` into this repo**, not even temporarily inside the repo. Read it from `../my-resume` only.
- **Never write the phone number** (or any part of the contact line besides email/LinkedIn/GitHub) into `/content` or anywhere else in this repo. It lives only inside `resume.pdf`.
- Never change an existing `id`. A renamed company or project keeps its id. Only new entries get new ids (kebab-case).
- Copy names verbatim. Certification names are official course titles (e.g. "Building Agentic RAG with Llamaindex"), so never "correct" their spelling or casing.
- Case studies and mentions are owner-written copy: carry them over **word for word**, never rewrite, summarize or "improve" them. Mention quotes keep only Paul's name ("…" marks other names left out).
- Do not touch `content/personas.json`, `content/site.json` and `content/pages.json` (site config), `content/recommendations.md` (hand-maintained), `content/github.json` (CI-generated) or `content/contributions-pinned.json`.

## Workflow

1. **Read the last synced commit.** `cat content/.source-sha`. If the file is missing, treat this as a full import: map every section (step 3) and diff against the current JSON instead of against git.

2. **Fetch and diff.**
   ```sh
   git -C ../my-resume fetch origin
   git -C ../my-resume diff <sha>..origin/main --stat -- resume.md resume.pdf case-studies mentions.md
   git -C ../my-resume diff <sha>..origin/main -- resume.md case-studies mentions.md
   ```
   If none of these changed, tell the owner "Résumé already in sync @ <short-sha>" and stop. Read the new version with `git -C ../my-resume show origin/main:resume.md` (not the working tree, which may hold uncommitted drafts).

3. **Map each changed section to its file** and update only the affected entries:

   | `resume.md` section | File | Notes |
   |---|---|---|
   | Header line (city, email, links) | `profile.json` | `location`, `email`, `links`. Skip the phone, and skip the `Website` link (it's this site). |
   | `## Profile` | `profile.json` → `summary`, `title` | `title` is the role the summary opens with ("Senior Software Developer"); a test enforces it. `tagline` is the landing hero's lede, a sentence of its own (the résumé intro below it opens with `summary`). It's site copy: flag it if the change makes it inaccurate, don't rewrite it silently. |
   | `## Top Skills` | `skills.json` | One group per bullet; `items` in source order. Keep `featured` a subset of `items`. |
   | `## Experience` → `### Company \| Location` | `experience.json` | `**Title** \| Month YYYY – Month YYYY` → `title`, `start`/`end` as `YYYY-MM` (`end: null` for "Present"). Each `* **Label:** text` → `highlights[]` `label` + `text`. `> **Tech Stack:**` → `stack`. For a new company, add a `shortName` (e.g. "Samsung") for the landing timeline. |
   | `## Projects` → `### Name \| Kind` | `projects.json` | `**Tagline** \| Month YYYY` → `tagline`, `date`. Intro paragraph → `summary`. Bullets → `highlights`. Tech Stack → `stack`. Strip Markdown emphasis. Skip the line between `## Projects` and the first project (it points to this site). |
   | `## Education & Certifications` | `education.json`, `certifications.json` | Degree lines → education; `**Name** – Issuer \| *Issued Mon YYYY*` → certifications (`issued` as `YYYY-MM`). |
   | `## Awards` | `awards.json` | Heading line → `name`, `issuer`, `received`; paragraph → `description`. |

   | `case-studies/<id>.md` | `case-studies.json` | Frontmatter → `id`, `title`, `role`, `stack` (comma list), `summary`; `experience` (company name) → `experienceId`; `period` "Month YYYY – Month YYYY" → `start`/`end` (`YYYY-MM`). Each `## Heading` → a section: `id` = kebab-case heading (apostrophes dropped), `heading`, `paragraphs` (blank-line separated, lines joined), `bullets` (`- ` lines). Keep **bold** as written. Optional frontmatter: `design` (name) → `designCredit.name`, plus `recommendationId` when a recommendation has that name; `nav` (heading → label) → that section's `navLabel`; `stats[]` → `stats[]` (`value`, `label`, `short` → `shortLabel`, `evidence`, `teaser`). In a section, a blockquote opening `> **Aside:** <kicker>` → `aside`: optional `> **Title:**` line → `title`, the remaining text → `text`, a trailing `[label](https://paul.emini.com/<path>)` → `linkLabel` + `href` (the site path, e.g. `/#derek-warner`). A fenced ```` ```figure ```` YAML block → `figure` as written. Asides and figures are not paragraphs or bullets. |
   | `mentions.md` → `## Title` | `mentions.json` | `id` = kebab-case title. `Author` "Name, Title" → `author`, `authorTitle`; `Date` → `date`; `Where` URL → `url`; `About` → `experienceId` (company) and `caseStudyId` (the `case-studies/<id>.md` it names); each `> ` line → `quotes`, verbatim. |

   Keep arrays in the order of the source (experience and projects most recent first).

   After converting, check every case-study paragraph, bullet and summary, and every mention quote, appears verbatim in the source (whitespace-normalized). Fix the conversion, not the text.

4. **Curated card copy.** `short` (experience highlights), `blurb` (projects, awards) and `tags` are condensed versions written for the cards, not résumé text. When the underlying `text`/`summary`/`description` changes, or a new entry is added, draft a new `short`/`blurb`/`tags` that states only what the source says, and list each one in the summary for the owner to review. Never introduce facts, numbers or names that aren't in the source.

   Some card copy has no source field and is hand-curated here, so a sync keeps it as is: `profile.focus`, `profile.bio`, `education[].schoolWikipedia`, `experience[].oneLiner` and `projects[].highlights[].short`. Flag any of them that a change makes inaccurate; don't rewrite them silently.

   Each experience, project and award has a `curatedFrom` fingerprint of the source fields its curated copy was written from. After a source change, `pnpm test:content` fails and prints the new fingerprint for every stale entry. Re-review (and redraft if needed) that entry's `short`/`blurb`/`tags`, then set `curatedFrom` to the printed value. Never update a fingerprint without reviewing the copy: the fingerprint is the record that the review happened.

5. **Copy the PDF** if it changed:
   ```sh
   git -C ../my-resume show origin/main:resume.pdf > content/resume.pdf
   cp content/resume.pdf public/resume.pdf
   ```

6. **Record the commit.** `git -C ../my-resume rev-parse origin/main > content/.source-sha`, and set `resumeSyncedAt` in `content/meta.json` to today's date (`YYYY-MM-DD`). The chat shows it as "from résumé · synced <date>".

7. **Verify.**
   ```sh
   pnpm test:content   # Zod schemas + content invariants
   pnpm test           # includes the no-phone / no-resume.md guards
   ```
   Also run the agent evals once they exist (Phase 6: `pnpm test:evals`). Fix failures before committing. Then run `git diff --stat` and confirm only files under `content/` and `public/resume.pdf` changed.

8. **Commit** (authored by the owner; no co-author or AI attribution lines; do not push):
   ```
   content: sync résumé @ <short-sha>

   - <one line per changed entry, e.g. "experience/smartthings: end date 2026-06">
   - drafted short copy for review: <ids>
   ```

9. **Report** the diff summary and the drafted card copy that needs the owner's review.
