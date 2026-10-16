import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('card catalogue (/dev/cards)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/cards/');
  });

  test('has no axe violations (WCAG 2.2 AA)', async ({ page }) => {
    // Let CardEnter springs settle: a card mid-fade would read as low contrast.
    await page.waitForFunction(() =>
      [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')].every(
        (el) => getComputedStyle(el).opacity === '1',
      ),
    );
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test('highlighted skills are marked, not just colored', async ({ page }) => {
    const skills = page.getByRole('region', { name: 'Top skills' });
    await expect(skills.locator('mark')).toHaveText([
      'React',
      'Next.js',
      'TypeScript',
      'Prompt Engineering',
      'Generative UI (AG-UI)',
    ]);
  });

  test('timeline Details opens the expanded experience', async ({ page }) => {
    await page.getByRole('button', { name: 'Details about Prism, Inc.' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Prism, Inc.' }).nth(1)).toBeVisible();
    await expect(page.getByText('Oct 2015 – May 2016 · 8 mo')).toBeVisible();
  });

  test('certifications expand the overflow', async ({ page }) => {
    const card = page.getByRole('region', { name: 'Certifications' });
    const toggle = card.getByRole('button', { name: '+ 2 from Frontend Masters' });
    await expect(card.getByRole('listitem')).toHaveCount(4);
    await toggle.click();
    await expect(card.getByRole('listitem')).toHaveCount(6);
    await expect(card.getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  test('recommendation shows the verbatim excerpt and expands the full text', async ({ page }) => {
    const figure = page.getByRole('figure').filter({ hasText: 'Dr. Luc Julia' });
    await expect(figure.locator('blockquote')).toContainText('elegant solutions');
    await figure.getByRole('button', { name: 'Read the full recommendation' }).click();
    await expect(
      figure.getByText(/rewrite our mobile software development framework/),
    ).toBeVisible();
    await expect(figure.getByRole('link', { name: 'Dr. Luc Julia on LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/lucjulia/',
    );
  });

  test('contact handoff sends the edited draft and copies it', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const draft = page.getByRole('textbox', { name: 'Your message to Paul' });
    await draft.fill('Hello & welcome');
    await expect(page.getByRole('link', { name: 'Open in email' })).toHaveAttribute(
      'href',
      /^mailto:paul@emini\.com\?subject=.+&body=Hello%20%26%20welcome$/,
    );
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(page.getByText('Copied to clipboard.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Hello & welcome');
  });

  test('contribution status is in text and rows are links', async ({ page }) => {
    const list = page.getByRole('region', { name: 'Open source contributions' }).first();
    await expect(list.getByText('PR · merged')).toBeVisible();
    await expect(
      list.getByRole('link', { name: 'Example: renderer drops partial JSON' }),
    ).toHaveAttribute('href', 'https://github.com/example-org/example-repo/issues/7');
  });

  test('skeleton announces loading', async ({ page }) => {
    await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  test('has no horizontal overflow', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
