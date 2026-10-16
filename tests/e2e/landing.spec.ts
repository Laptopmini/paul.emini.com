import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('landing', () => {
  test('has no axe violations (WCAG 2.2 AA)', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test('renders the timeline from content', async ({ page, isMobile }) => {
    test.skip(isMobile, 'timeline is hidden on phones');
    await page.goto('/');
    const rows = page.getByRole('list', { name: 'Recent timeline' }).getByRole('listitem');
    await expect(rows).toHaveCount(4);
    await expect(rows.first()).toContainText('Ragoût');
    await expect(rows.last()).toContainText('Samsung · Prism · Imprivata');
  });

  test('persona toggle switches pills and persists', async ({ page }) => {
    await page.goto('/');
    const visitor = page.getByRole('button', { name: 'Visitor' });
    const engineer = page.getByRole('button', { name: 'Engineer' });
    await expect(visitor).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'What are your top skills?' })).toBeVisible();

    await engineer.click();
    await expect(engineer).toHaveAttribute('aria-pressed', 'true');
    await expect(visitor).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Walk me through Ralph-node' })).toBeVisible();
    await expect(page.getByText('Deeper detail, architecture and trade-offs.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Engineer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('persona toggle still works when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Recruiter' }).click();
    await expect(page.getByRole('button', { name: 'Give me the 30-second summary' })).toBeVisible();
  });

  test('dock enforces 400 characters with a live counter', async ({ page }) => {
    await page.goto('/');
    const input = page.getByRole('textbox', { name: 'Ask Paul’s agent' });
    await input.fill('x'.repeat(450));
    await expect(input).toHaveValue('x'.repeat(400));
    await expect(page.getByText('400/400')).toBeVisible();
  });

  test('download link keeps its accessible name at every width', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Download résumé' })).toBeVisible();
  });

  test('phones skip the timeline so the ask panel is closer to the fold', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'phone layout only');
    await page.goto('/');
    await expect(page.getByRole('list', { name: 'Recent timeline' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Visitor' })).toBeInViewport();
  });

  test('contact links have descriptive names and fit one row on phones', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Contact' });
    await expect(nav.getByRole('link', { name: 'paul@emini.com' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'LinkedIn' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'GitHub: Laptopmini' })).toBeVisible();
    if (isMobile) {
      const tops = await nav
        .getByRole('link')
        .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
    }
  });

  test('header stays on one row at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const header = page.getByRole('banner');
    const brand = await header.getByRole('link').first().boundingBox();
    const resume = await header.getByRole('link', { name: 'Download résumé' }).boundingBox();
    expect(Math.abs((brand?.y ?? 0) - (resume?.y ?? 100))).toBeLessThan(4);
  });

  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('landing without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the visitor persona, pills and dock', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Visitor' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'How was this site built?' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Ask Paul’s agent' })).toBeVisible();
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('timeline rows are not animated', async ({ page, isMobile }) => {
    test.skip(isMobile, 'timeline is hidden on phones');
    await page.goto('/');
    const animation = await page
      .getByRole('list', { name: 'Recent timeline' })
      .getByRole('listitem')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');
  });
});
