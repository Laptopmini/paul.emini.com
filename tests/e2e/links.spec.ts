import { expect, test } from '@playwright/test';

// Every link that leaves the site opens in a new tab, safely, and says so.
for (const path of ['/', '/dev/cards/']) {
  test(`external links open in a new tab on ${path}`, async ({ page, baseURL }) => {
    await page.goto(path);
    const links = await page.locator('a[href^="http"]').evaluateAll((els) =>
      els.map((a) => ({
        href: a.getAttribute('href') ?? '',
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel') ?? '',
        text: a.textContent ?? '',
      })),
    );
    const external = links.filter((l) => !l.href.startsWith(baseURL ?? '__'));
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      expect(link, link.href).toMatchObject({ target: '_blank' });
      expect(link.rel, link.href).toContain('noopener');
      expect(link.text, link.href).toContain('(opens in a new tab)');
    }
  });
}
