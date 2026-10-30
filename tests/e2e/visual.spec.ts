import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// Full-page screenshots of the static pages at the boards' widths (390 and 1440), to
// catch layout regressions. Reduced motion keeps them still (no count-up, reveals or
// autoplay); the open-source list and repo tiles are masked because github.json
// changes daily. Baselines are per platform: they're recorded on macOS, so CI (Linux)
// skips these until Linux baselines are added (`--update-snapshots` in the Playwright
// container).

const caseStudies: { id: string }[] = JSON.parse(
  readFileSync(join(process.cwd(), 'content', 'case-studies.json'), 'utf8'),
);
const paths = caseStudies.map((c) => `/work/${c.id}/`);

test.describe('static pages look like the boards', () => {
  test.use({ reducedMotion: 'reduce' });
  test.skip(!!process.env.CI, 'baselines are recorded on macOS');

  for (const width of [390, 1440]) {
    for (const path of paths) {
      test(`${path} at ${width}px`, async ({ page }, info) => {
        test.skip(info.project.name !== 'desktop', 'one browser is enough for screenshots');
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        // A full-page capture keeps a 900px viewport, so the sticky bottom bar would land mid-page.
        await page.addStyleTag({
          content: '[aria-label="Page actions"] { position: static !important; }',
        });
        const name = `${path.replaceAll('/', '-').replace(/^-|-$/g, '')}-${width}.png`;
        await expect(page).toHaveScreenshot(name, {
          fullPage: true,
          mask: [
            page.locator('[aria-labelledby="open-source"]'),
            page.locator('#more-on-github + ul'),
          ],
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});
