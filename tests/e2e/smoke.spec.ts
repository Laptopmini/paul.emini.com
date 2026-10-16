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

test('résumé PDF is downloadable from the header', async ({ page, request }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: 'Download résumé' });
  await expect(link).toHaveAttribute('download', 'Paul-Valentin-Mini-Resume.pdf');
  const response = await request.get((await link.getAttribute('href')) ?? '');
  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
});
