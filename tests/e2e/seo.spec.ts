import { expect, test } from '@playwright/test';

// Bing Webmaster Tools flags a page whose title is over 70 characters or whose meta
// description is outside 25–160. Every page in the sitemap must fit, new ones included.
test('every sitemap page has a search-sized title and description', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(String(m[1])).pathname,
  );
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    await page.goto(path);
    const title = await page.title();
    const description =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(title.length, `${path} title: ${title}`).toBeLessThanOrEqual(70);
    expect(description.length, `${path} description`).toBeGreaterThanOrEqual(25);
    expect(description.length, `${path} description`).toBeLessThanOrEqual(160);
  }
});
