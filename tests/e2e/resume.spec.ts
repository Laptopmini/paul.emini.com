import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Read straight from /content (Playwright can't load the app's JSON and .md imports).
const read = (file: string) => readFileSync(join(process.cwd(), 'content', file), 'utf8');
const json = (file: string) => JSON.parse(read(file));
const awards: { name: string }[] = json('awards.json');
const caseStudies: {
  id: string;
  title: string;
  summary: string;
  sections: { heading: string; paragraphs: string[]; bullets: string[] }[];
}[] = json('case-studies.json');
const certifications: { name: string; issuer: string }[] = json('certifications.json');
const experience: { id: string; company: string; highlights: { text: string }[] }[] =
  json('experience.json');
const mentions: { authorTitle: string }[] = json('mentions.json');
const pages: { caseStudyPublished: Record<string, string> } = json('pages.json');
const projects: { id: string; summary: string; repo?: string }[] = json('projects.json');
const github: { repos: { name: string; readme?: string; description: string | null }[] } =
  json('github.json');
const highlights: Record<string, string> = json('recommendation-highlights.json');
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
/** Every paragraph of each recommendation (the full text, not just the marked excerpt). */
const recommendations = read('recommendations.md')
  .split(/^## /m)
  .slice(1)
  .map((chunk) => ({
    name: chunk.split('\n')[0] ?? '',
    paragraphs: chunk
      .split(/\n\s*\n/)
      .slice(1)
      .map(squash)
      .filter((p) => p && !p.startsWith('-')),
  }));

// The résumé on the landing page and the case studies exist for people who won't chat
// and for crawlers that can't: every fact must be in the server-rendered HTML, with
// JavaScript off.

test.describe('static résumé pages', () => {
  test.use({ javaScriptEnabled: false });

  test('the landing page has every role, project, recommendation, award and mention', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Résumé' })).toBeAttached();
    for (const e of experience) {
      await expect(page.locator(`#${e.id}`).getByRole('heading', { level: 3 })).toHaveText(
        e.company,
      );
      for (const h of e.highlights) await expect(page.locator(`#${e.id}`)).toContainText(h.text);
    }
    for (const p of projects) await expect(page.locator(`#${p.id}`)).toContainText(p.summary);
    const curated = new Set(projects.map((p) => p.repo?.split('/')[1]?.toLowerCase()));
    for (const r of github.repos.filter((r) => !curated.has(r.name.toLowerCase()))) {
      const entry = page.locator(`#repo-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
      await expect(entry.getByRole('heading', { level: 4 })).toContainText(r.name);
      const text = r.readme ?? r.description;
      if (text) await expect(entry).toContainText(text);
    }
    for (const [id, sentence] of Object.entries(highlights)) {
      await expect(page.locator(`#${id} blockquote`)).toContainText(sentence);
    }
    const main = page.getByRole('main');
    for (const r of recommendations) {
      expect(r.paragraphs.length).toBeGreaterThan(0);
      for (const p of r.paragraphs) await expect(main).toContainText(p);
    }
    for (const c of certifications) {
      await expect(page.getByRole('list', { name: /Certifications/ })).toContainText(c.name);
    }
    for (const a of awards) await expect(page.getByText(a.name)).toBeVisible();
    for (const m of mentions) await expect(page.getByText(m.authorTitle)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download résumé' })).toHaveAttribute(
      'href',
      /resume\.pdf$/,
    );
  });

  test('only the latest role starts open; the others are closed <details>', async ({ page }) => {
    await page.goto('/');
    const [latest, ...earlier] = experience.map((e) => page.locator(`#${e.id} details`));
    if (latest) await expect(latest).toHaveAttribute('open', '');
    for (const role of earlier) await expect(role).not.toHaveAttribute('open');
  });

  test('every anchor id is unique', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('[id]').evaluateAll((els) => els.map((el) => el.id));
    expect(ids.length).toBe(new Set(ids).size);
    for (const id of ['ask', 'resume']) expect(ids).toContain(id);
    expect(ids).not.toContain('chat');
  });

  test('each case study page has every heading, paragraph and bullet', async ({ page }) => {
    for (const c of caseStudies) {
      await page.goto(`/work/${c.id}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.title);
      const main = page.getByRole('main');
      await expect(main).toContainText(c.summary);
      for (const s of c.sections) {
        await expect(page.getByRole('heading', { level: 2, name: s.heading })).toBeVisible();
        for (const text of [...s.paragraphs, ...s.bullets]) {
          await expect(main).toContainText(squash(text.replaceAll('**', '')));
        }
      }
    }
  });

  test('“Rather read?” links into the résumé', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Rather read\? My résumé is right below/ }).click();
    await expect(page).toHaveURL(/#resume$/);
    await expect(page.locator('#resume')).toBeInViewport();
  });
});

test.describe('/resume moved to the landing page', () => {
  test('/resume/ lands on /#resume', async ({ page }) => {
    await page.goto('/resume/');
    await expect(page).toHaveURL(/\/#resume$/);
  });

  test('/resume/#<id> keeps the anchor', async ({ page }) => {
    await page.goto(`/resume/#${experience[0]?.id}`);
    await expect(page).toHaveURL(new RegExp(`/#${experience[0]?.id}$`));
  });

  test('the stub redirects without JS, and is not indexed', async ({ browser, request }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/resume/');
    await expect(page).toHaveURL(/\/#resume$/);
    await context.close();
    const stub = await (await request.get('/resume/')).text();
    expect(stub).toContain('<meta name="robots" content="noindex">');
    expect(stub).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/">/);
  });
});

test.describe('static résumé pages, with JavaScript', () => {
  test('at the end of the page, the last section is the current one', async ({ page }) => {
    for (const path of ['/', ...caseStudies.map((c) => `/work/${c.id}/`)]) {
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      // Every copy of the section links is kept in sync, including ones hidden at this width.
      await expect(page.locator('[data-spy] a').last()).toHaveAttribute('aria-current', 'true');
      const last = await page.locator('[data-spy] a').last().textContent();
      const picker = page.locator('[data-spy-label]');
      if (await picker.count()) await expect(picker).toHaveText(last?.replace(/^\d+/, '') ?? '');
    }
  });

  for (const path of caseStudies.map((c) => `/work/${c.id}/`)) {
    test(`${path} has no axe violations (WCAG 2.2 AA)`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  }
});

test.describe('machine-readable layer', () => {
  test.use({ javaScriptEnabled: false });

  test('robots.txt allows everyone and points to the sitemap', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toMatch(/User-Agent: \*\s+Allow: \//);
    expect(robots).toContain('/sitemap.xml');
  });

  test('the sitemap lists every page', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    for (const path of ['/', ...caseStudies.map((c) => `/work/${c.id}/`)]) {
      expect(sitemap).toContain(`${path}</loc>`);
    }
    expect(sitemap).not.toContain('/resume/');
  });

  test('llms.txt links the résumé and case studies', async ({ request }) => {
    const llms = await (await request.get('/llms.txt')).text();
    expect(llms).toContain('/#resume');
    expect(llms).toContain(`/#${experience[0]?.id}`);
    expect(llms).not.toContain('/resume/');
    for (const c of caseStudies) expect(llms).toContain(`/work/${c.id}/`);
  });

  test('pages carry valid schema.org data from /content', async ({ page }) => {
    const blocks = async () =>
      (await page.locator('script[type="application/ld+json"]').allTextContents()).map((text) =>
        JSON.parse(text),
      );
    await page.goto('/');
    const home = await blocks();
    expect(home.find((b) => b['@type'] === 'WebSite')).toMatchObject({
      name: 'Paul-Valentin Mini',
    });
    const data = home.find((b) => b['@type'] === 'ProfilePage');
    expect(data.mainEntity).toMatchObject({ '@type': 'Person', name: 'Paul-Valentin Mini' });
    expect(data.mainEntity.award.join(' ')).toContain(awards[0]?.name);
    const photo = await page.request.get(new URL(data.mainEntity.image.url).pathname);
    expect(photo.headers()['content-type']).toBe('image/jpeg');
    for (const c of caseStudies) {
      await page.goto(`/work/${c.id}/`);
      const study = await blocks();
      expect(study.find((b) => b['@type'] === 'Article')).toMatchObject({
        headline: c.title,
        datePublished: pages.caseStudyPublished[c.id],
      });
      const trail = study.find((b) => b['@type'] === 'BreadcrumbList');
      expect(trail.itemListElement.at(-1)).toMatchObject({ name: c.title });
      expect(trail.itemListElement[0].item).toMatch(/\/$/);
    }
  });
});

test('timeline rows jump to their part of the résumé', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the timeline is hidden on phones');
  await page.goto('/');
  await page
    .getByRole('list', { name: 'Recent timeline' })
    .getByRole('link', { name: /SmartThings/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/#${experience[0]?.id}$`));
  await expect(page.locator(`#${experience[0]?.id}`)).toBeInViewport();
});

test('case-study links back to the résumé land on the landing page', async ({ page }) => {
  await page.goto(`/work/${caseStudies[0]?.id}/`);
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link').first(),
  ).toHaveAttribute('href', /\/#resume$/);
});
