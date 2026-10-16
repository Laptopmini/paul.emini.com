import { expect, test } from '@playwright/test';

test('landing renders the hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Paul‑Valentin');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('landing is server-rendered HTML', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Paul‑Valentin');
  });
});

test('focus ring uses the accent token', async ({ page }) => {
  await page.goto('/404');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(
    () => getComputedStyle(document.activeElement as Element).outlineWidth,
  );
  expect(outline).toBe('3px');
});
