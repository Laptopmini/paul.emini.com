# Static pages redesign — `/resume` and `/work/[id]`

Both pages currently render as one narrow 880px column (`components/resume/resume.module.css` → `.main { max-width: 880px }`). This brief redesigns them to use desktop width, improve mobile, and add motion **without** moving any content out of the server-rendered HTML. These pages exist for people who won't use the agent and for search engines and LLM crawlers, so that last rule outranks everything else.

Reference boards (visual references only, same custom runtime caveat as `docs/design/`):

| File | Shows |
|---|---|
| `docs/design/static-pages/ResumeDesktop.dc.html` | `/resume` at 1440 (has a working carousel in its script block: read it for behaviour) |
| `docs/design/static-pages/ResumeMobile.dc.html` | `/resume` at 390 |
| `docs/design/static-pages/CaseStudyDesktop.dc.html` | `/work/unified-journey` at 1440 |
| `docs/design/static-pages/CaseStudyMobile.dc.html` | `/work/unified-journey` at 390 |

**Desktop and mobile are one responsive page each, not separate routes.** Mobile boards trim copy to keep the mockup short; production renders the full content at every width.

---

## 0. Non-negotiables

1. **Every word stays in the initial HTML.** Collapsed roles use native `<details>`. Carousel slides are all rendered on the server, in order, as real `<figure>`s. Nothing is fetched or created client-side. Check with JS disabled.
2. **All data comes from `/content`.** Stats, asides, rollout stages and "at a glance" values seen on the boards must come from content files (new fields below) or be derived from them. Never hard-code copy in components.
3. **Motion is progressive enhancement.** CSS-first (`@supports (animation-timeline: …)`), with nothing broken without it. Everything respects `prefers-reduced-motion`.
4. **Existing links keep working:** `/resume/#<experienceId>`, `/resume/#<recommendationId>` (from `withRecommenderLinks`), and `#repo-*` ids.
5. Tokens only from `app/tokens.css`. `--accent` stays the only color to change.
6. Accessibility bar from CLAUDE.md (44px targets, `:focus-visible`, contrast, real buttons and links).

## 1. Shared layout pieces (`components/resume/`)

- **`PageNav`:** site header gains `Résumé` / `Case study` links with `aria-current="page"` and keeps "Ask my agent". Reuse `SiteHeader`, extending it rather than forking.
- **`OnThisPage`:** a single component with two presentations:
  - ≥1100px: a sticky left rail (`position: sticky; top: 96px`) with a numbered list and the active item shown by an accent left border.
  - <1100px: a horizontal scrolling tab strip, sticky under the header (résumé), or a `<details>` "03 / 09 · The idea" picker (case study).
  - Scrollspy uses IntersectionObserver and sets `aria-current="true"` on the active link. Links are plain `#anchors`, so it works without JS.
  - Reading progress is a thin accent bar. Use `animation-timeline: scroll(root)` where supported, and hide it where not (no JS fallback needed).
- **Layout container:** `max-width: 1340px`, a two-column flex-wrap: rail `flex: 0 0 200–220px` and content `flex: 999 1 640px; min-width: 0`. It collapses to one column under 1100px. Gutters are 48px desktop and 16–20px mobile.
- **`StatTiles`:** a `<dl>` of label/value tiles. The last tile can be an inverted (ink) variant. Values can count up on first view only when motion is allowed; the real number is always in the HTML.

## 2. `/resume`

Section order: Hero → Highlights → Experience → Projects (+ More on GitHub) → Skills → Recommendations → Education & certifications | Open source (side by side) → "Rather just ask?" CTA.

- **Hero:** a two-column grid.
  - Left: location, H1 (88px desktop, 52px mobile), title in `--accent-strong`, and the summary.
  - Right: an "At a glance" card with a `<dl>` of four items, contact links, Download PDF, and Ask my agent.
  - Glance values:
    - **Experience:** derived from the earliest `experience.start` ("10+ yrs", rounded down to a multiple of 5 with a "+").
    - **Most recent:** `experience[0].shortName` plus its year range.
    - **Focus:** new `profile.focus: string[]`.
    - **Open source:** the top 3 repo owners by count in `github.contributions`, mapped to display names. Add `content/site.json → ossDisplayNames` if needed.
  - On mobile, glance shows only the first two items, and contact becomes a 3-up grid of icon tiles.
- **Highlights:** a bento grid.
  - The case study is a full-width ink card with title, summary, the stats row (from `caseStudies[].stats`, see §4) and "Read the case study".
  - `Mention` and `Award` sit in a row below.
- **Experience:** a timeline.
  - Grid `120px | 24px | 1fr`: dates and duration in mono on the left, a node on the line, then the card.
  - The vertical line is drawn with a gradient. Where `animation-timeline: view()` is supported, the accent portion grows as the section scrolls.
  - The first two roles are `<details open>`, the rest `<details>` closed with a one-line summary (company · title · new `experience[].oneLiner`, or the first highlight's `short`).
  - A chevron rotates on open. The node is accent for the current role and `--line-2` for past roles.
  - The case-study link stays inline in the relevant highlight.
- **Projects:** two side-by-side cards. Highlights render as a ruled list showing the label in bold plus a dash and a short gloss (new `highlights[].short` on projects; fall back to `label` only). "More on GitHub" is a 4-up grid of linked repo tiles. On mobile, projects become a horizontal scroll-snap row.
- **Skills:** a 4-up grid of cards. Chips in `skills[].featured` use the ink style, the rest the ground style.
- **Recommendations:** a carousel (§3).
- **Education | Open source:** a two-column grid.
  - Certifications are an `<ol>` newest first, with a mono date column.
  - Open source rows use grid `124px | 1fr; align-items: start`. **Status pills must be the same width with centered labels:** `.status { width: 100%; min-height: 24px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; margin-top: 1px; white-space: nowrap }`.
  - Labels are "PR · merged", "PR · open" and "Issue · open/closed". On mobile the pill sits above the title.
- **Mobile:** a sticky bottom bar with two buttons, Download PDF and Ask my agent, which must not cover content (add matching bottom padding).

## 3. Recommendation carousel (`components/resume/RecommendationCarousel.tsx`)

The server renders all slides. A small client island adds the behaviour.

- **Markup:**
  - `<section aria-roledescription="carousel" aria-labelledby=…>`.
  - The viewport is `overflow-x: auto; scroll-snap-type: x mandatory`. This is the no-JS and touch baseline, so it works as a plain swipe or scroll.
  - Each slide is a `<figure role="group" aria-roledescription="slide" aria-label="2 of 4: Derek Warner" id={rec.id}>`.
  - Slide width is `min(760px, 86%)` with a 20px gap, so the next card peeks in.
- **Content:** the **full** recommendation text, with the `recommendationHighlights[id]` excerpt wrapped in `<mark>` (display font, accent-tint background).
  - Only mark it if the excerpt is verbatim. Reuse the existing `pickExcerpt` check.
  - Reuse `Recommendation` with a new `highlight` mode, not a fork.
  - On mobile, cards may truncate after the mark, with a `<details>` "Read the full recommendation". The text stays in the DOM.
- **Controls (JS):**
  - Pause/play, previous and next buttons (44px).
  - One dot per slide, each a 44px hit area with a visual pill. The active pill widens and fills over the interval.
  - Clicking a dot or arrow scrolls the viewport with `scrollTo({ behavior })`.
  - Keep the active index in sync from scroll position (IntersectionObserver on slides) so manual swipes update the dots.
- **Autoplay:**
  - Advance every 7s (`site.json → carouselIntervalMs`).
  - Pause on hover, on `:focus-within`, when the user presses pause (sticky until they press play), when the section is offscreen, and when `document.hidden`.
  - No autoplay at all under `prefers-reduced-motion` (dots show fully filled).
  - `aria-live="off"` while playing, `"polite"` while paused.
- **Keyboard:** ←/→ move between slides when focus is inside the carousel. No global key handlers.
- **Deep links:** on load and on `hashchange`, if the hash matches a slide id, select that slide (no smooth scroll on initial load) and scroll the section into view. This keeps `withRecommenderLinks` from the case study working.

## 4. `/work/[id]`

Section order: Breadcrumb → H1 → lead + facts `<dl>` → StatTiles → body (rail | article) → 2-up "What I'd do differently" / "What's next" → footer actions.

- **Hero:**
  - H1 at 76px. The part after the colon renders in `--muted`; split on the first `: ` in `title`.
  - The facts `<dl>` lists Role, Company, Timeline, Design credit and Stack chips.
  - The stats row comes from `stats`.
- **Body:** each section is a grid `minmax(0,1fr) 260px`. Prose sits in column 1 at max 680px, the optional aside in column 2. Figures span both. Under 1100px the aside drops below the prose.
- Sections get mono kickers (`01`…`09`).
- **Section figures** are rendered by id from a `figure` field (see content changes):
  - `architecture`: four columns, Contract → Modules → Two generic pages → Context (DI), with a `<figcaption>`. Built from HTML, not an image. Decorative boxes may be `aria-hidden` as long as the figcaption and the bullets carry the meaning.
  - `before-after`: two cards, before (form skeleton, one field flagged) and after (overview with progress and section rows). `aria-hidden` mock plus visible captions, labelled "Illustrative, not production screenshots". On mobile it becomes a two-card scroll-snap row.
  - `rollout`: an `<ol>` stepper from `stages`. Horizontal with connector lines on desktop, vertical on mobile. The last stage uses an accent check.
- **Impact:** bullets render as tiles (bold lead and remainder, split on the existing `**…**` markup). The `Mention` becomes a full-width ink quote panel, which replaces the separate "Announced as…" tile visually. Keep that bullet in the HTML: put it in the panel's figcaption or keep it as a tile.
- "What I'd do differently" and "What's next" become two cards side by side (or a `<details>` and a card on mobile).
- **Mobile:** sticky section picker plus progress, 2×2 stats, stacked figures, and a sticky bottom bar (Résumé / Ask about it).

### Content changes (`content/case-studies.json` + Zod schema)

```ts
stats?: { label: string; value: string; inverted?: boolean }[]   // e.g. 120+ partners served, 12 protocols, All migrated, Zero breakage
designCredit?: { name: string; recommendationId?: string }
sections[].aside?: { kicker: string; title?: string; text: string; href?: string; linkLabel?: string }
sections[].figure?: 'architecture' | 'before-after' | 'rollout'
sections[].stages?: { label: string; note?: string }[]           // rollout only
```

Fill them for `unified-journey` from the existing prose (values on the boards). **Stats must be supported by text already in the case study.** Add a content test that each `stat.value` appears in the section text, or is "All"/"Zero" backed by an Impact bullet.

Also add `profile.focus`, an optional `experience[].oneLiner`, an optional `projects[].highlights[].short`, and `site.carouselIntervalMs`. Update the `/sync-resume` skill so it knows these fields are hand-curated and preserved across syncs.

## 5. Motion and polish

- **Cross-document view transitions:** add `@view-transition { navigation: auto; }` (static export, so this is MPA navigation). Give the case-study title on the résumé teaser and the H1 on `/work/[id]` the same `view-transition-name: case-<id>` so it morphs. Keep the existing `brand` name working.
- **Scroll reveals:** section headings and cards fade and rise in with `animation-timeline: view(); animation-range: entry 0% cover 25%`, inside `@supports` and `prefers-reduced-motion: no-preference`. Content stays visible with no JS and no support.
- **Hover:** cards lift 3px and their border strengthens. Arrows on "View the repo" and "Read the case study" nudge. Use the existing `--duration` / `--ease`.
- **Print** (`@media print` for `/resume`): one column, no nav, rail, carousel controls, CTA or bottom bar. Every role and recommendation is expanded (`details` content shown), links are printed after the text, and the page uses ink on white.
- **SEO:**
  - Keep `JsonLd` personData and caseStudyData.
  - Add `breadcrumb` (BreadcrumbList) to `/work/[id]`.
  - Do **not** add Review/AggregateRating schema for the recommendations. Google treats reviews about yourself as self-serving, so they're ineligible.
  - Keep one H1 per page and the H2/H3 hierarchy.
  - Make sure `llms.txt` links both pages.

## 6. Tests

- **Playwright, JS disabled:**
  - `/resume` contains all five roles' highlights, all four full recommendation texts and every certification.
  - `/work/unified-journey` contains every section paragraph and bullet.
- **Playwright, carousel:**
  - Autoplay advances, hover pauses, the pause button stays paused.
  - ←/→ work.
  - The `/resume/#derek-warner` deep link selects slide 2.
  - Reduced motion gives no autoplay.
  - Swiping at 390 updates the dots.
- **Playwright visual:** screenshots of both pages at 390 and 1440, plus axe with no violations.
- **Content test** for the stats rule in §4.
- **Lighthouse:** 95+ on all categories for both pages.

## 7. Suggested order

1. Content fields, schema and tests.
2. Layout shell: container, rail and tab strip, scrollspy, progress.
3. `/resume` sections, then the carousel.
4. `/work/[id]` hero, asides, figures, impact panel.
5. Motion, view transitions and print.
6. Tests and a Lighthouse pass, comparing against the boards at 390 and 1440.
