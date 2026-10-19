import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Read straight from /content (Playwright can't load the app's JSON and .md imports).
const read = (file: string) => readFileSync(join(process.cwd(), 'content', file), 'utf8');
const json = (file: string) => JSON.parse(read(file));
const awards: { name: string }[] = json('awards.json');
const caseStudies: { id: string; title: string; sections: { heading: string }[] }[] =
  json('case-studies.json');
const experience: { id: string; company: string; highlights: { text: string }[] }[] =
  json('experience.json');
const mentions: { authorTitle: string }[] = json('mentions.json');
const profile: { firstName: string } = json('profile.json');
const projects: { id: string; summary: string; repo?: string }[] = json('projects.json');
const github: { repos: { name: string; readme?: string; description: string | null }[] } =
  json('github.json');
const highlights: Record<string, string> = json('recommendation-highlights.json');
/** Each recommendation's last paragraph (proves the full text is there, not just a quote). */
const recommendations = read('recommendations.md')
  .split(/^## /m)
  .slice(1)
  .map((chunk) => {
    const paragraphs = chunk.split(/\n\s*\n/).filter((p) => p.trim() && !p.trim().startsWith('-'));
    return {
      name: chunk.split('\n')[0] ?? '',
      last: (paragraphs.at(-1) ?? '').replace(/\s+/g, ' ').trim(),
    };
  });

// The static pages exist for people who won't chat and for crawlers that can't: every
// fact must be in the server-rendered HTML, with JavaScript off.

test.describe('static résumé pages', () => {
  test.use({ javaScriptEnabled: false });

  test('/resume has every role, project, recommendation, award and mention', async ({ page }) => {
    await page.goto('/resume/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Paul.Valentin Mini/);
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
    for (const r of recommendations) await expect(page.getByText(r.last)).toBeVisible();
    for (const a of awards) await expect(page.getByText(a.name)).toBeVisible();
    for (const m of mentions) await expect(page.getByText(m.authorTitle)).toBeVisible();
    await expect(page.getByRole('link', { name: /Download PDF/ })).toHaveAttribute(
      'href',
      /resume\.pdf$/,
    );
  });

  test('each case study has its own page', async ({ page }) => {
    for (const c of caseStudies) {
      await page.goto(`/work/${c.id}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.title);
      for (const s of c.sections) {
        await expect(page.getByRole('heading', { level: 2, name: s.heading })).toBeVisible();
      }
    }
  });

  test('the landing links into the résumé', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones hide the timeline and its link');
    await page.goto('/');
    await page.getByRole('link', { name: 'Full résumé' }).click();
    await expect(page).toHaveURL(/\/resume\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      new RegExp(profile.firstName.replace('-', '[-‑]')),
    );
  });
});

test.describe('static résumé pages, with JavaScript', () => {
  for (const path of ['/resume/', ...caseStudies.map((c) => `/work/${c.id}/`)]) {
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
    for (const path of ['/', '/resume/', ...caseStudies.map((c) => `/work/${c.id}/`)]) {
      expect(sitemap).toContain(`${path}</loc>`);
    }
  });

  test('llms.txt links the résumé and case studies', async ({ request }) => {
    const llms = await (await request.get('/llms.txt')).text();
    expect(llms).toContain('/resume/');
    for (const c of caseStudies) expect(llms).toContain(`/work/${c.id}/`);
  });

  test('pages carry valid schema.org data from /content', async ({ page }) => {
    for (const path of ['/', '/resume/']) {
      await page.goto(path);
      const data = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
      );
      expect(data).toMatchObject({ '@type': 'Person', name: 'Paul-Valentin Mini' });
      expect(data.award.join(' ')).toContain(awards[0]?.name);
    }
    for (const c of caseStudies) {
      await page.goto(`/work/${c.id}/`);
      const data = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
      );
      expect(data).toMatchObject({ '@type': 'Article', headline: c.title });
    }
  });
});

test('timeline rows open their part of the résumé', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the timeline is hidden on phones');
  await page.goto('/');
  await page.getByRole('list', { name: 'Recent timeline' }).getByRole('link').nth(2).click();
  await expect(page).toHaveURL(new RegExp(`/resume/#${experience[0]?.id}$`));
});
