import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';

// The recommendation carousel in the résumé on the landing page: every slide is server-rendered (see
// resume.spec.ts); these check the behaviour the client island adds.

const pages: { carouselIntervalMs: number } = JSON.parse(
  readFileSync(join(process.cwd(), 'content', 'pages.json'), 'utf8'),
);
const names = readFileSync(join(process.cwd(), 'content', 'recommendations.md'), 'utf8')
  .split(/^## /m)
  .slice(1)
  .map((chunk) => chunk.split('\n')[0]?.trim() ?? '');
/** Long enough for one autoplay step to have happened. */
const STEP = pages.carouselIntervalMs + 2_000;

const dot = (page: Page, i: number) =>
  page.getByRole('button', { name: `Show recommendation from ${names[i]}` });
const carousel = (page: Page) => page.locator('[aria-roledescription="carousel"]');

/** Brings the carousel on screen with the pointer and focus elsewhere, so autoplay runs. */
async function open(page: Page) {
  await page.goto('/');
  await carousel(page).scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
}

test.describe('recommendation carousel', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, 'pointer and keyboard behaviour; phones are covered below');
  });

  test('advances on its own', async ({ page }) => {
    await open(page);
    await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true', { timeout: STEP });
  });

  test('pauses while hovered', async ({ page }) => {
    await open(page);
    await page.getByRole('group', { name: `1 of ${names.length}: ${names[0]}` }).hover();
    await page.waitForTimeout(STEP);
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
  });

  test('stays paused after the pause button, until play', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Pause recommendations' }).click();
    // Move the pointer and focus away: only the button press should keep it paused.
    await page.mouse.click(1, 1);
    await page.waitForTimeout(STEP);
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('button', { name: 'Play recommendations' })).toBeVisible();
  });

  test('moves with the arrow keys when focus is inside', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Next recommendation' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(dot(page, 1)).toHaveAttribute('aria-current', 'true');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(dot(page, names.length - 1)).toHaveAttribute('aria-current', 'true');
  });

  test('a link to a recommendation selects its slide', async ({ page }) => {
    await page.goto('/#derek-warner');
    const index = names.indexOf('Derek Warner');
    expect(index).toBe(1);
    await expect(dot(page, index)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#derek-warner')).toBeInViewport({ ratio: 0.5 });
  });
});

test.describe('recommendation carousel, reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('never autoplays', async ({ page, isMobile }) => {
    test.skip(isMobile, 'same behaviour on every width');
    await open(page);
    await page.waitForTimeout(STEP);
    await expect(dot(page, 0)).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('recommendation carousel at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('swiping updates the dots', async ({ page }) => {
    await open(page);
    // A swipe is a horizontal scroll of the row; the dots follow the slide in view.
    await page
      .locator('[aria-roledescription="carousel"] [aria-live]')
      .evaluate((row) => row.scrollTo({ left: (row.children[2] as HTMLElement).offsetLeft }));
    await expect(dot(page, 2)).toHaveAttribute('aria-current', 'true');
  });
});
