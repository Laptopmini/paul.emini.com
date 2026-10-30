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
    // A fifth row on top shows the latest GitHub activity, when it's under 30 days old.
    const latest = rows.filter({ hasText: 'Latest on GitHub' });
    await expect(rows).toHaveCount((await latest.count()) ? 5 : 4);
    await expect(rows.filter({ hasText: 'Ragoût' })).toHaveCount(1);
    await expect(rows.last()).toContainText('Samsung · Prism · Imprivata');
    if (await latest.count()) {
      await expect(rows.first()).toContainText('Latest on GitHub');
      await expect(latest.getByRole('link')).toHaveAttribute('href', '#open-source');
    }
  });

  test('persona toggle switches pills and persists', async ({ page }) => {
    await page.goto('/');
    const visitor = page.getByRole('button', { name: 'Friend' });
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
    await expect(page.getByRole('button', { name: 'Friend' })).toBeInViewport();
  });

  test('the timeline shows only beside the hero copy, never wrapped under it', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'widths are set explicitly');
    const timeline = page.getByRole('list', { name: 'Recent timeline' });
    for (const width of [768, 1024, 1139]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(timeline, `${width}px`).toBeHidden();
    }
    for (const width of [1140, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const rows = await timeline.boundingBox();
      const title = await page.getByRole('heading', { level: 1 }).boundingBox();
      expect(rows?.x, `${width}px`).toBeGreaterThan((title?.x ?? 0) + 400);
      expect(rows?.y, `${width}px`).toBeLessThan((title?.y ?? 0) + (title?.height ?? 0));
    }
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

test.describe('landing and résumé on one page', () => {
  test('the ask panel footer fits at 1440×900, centered under the dock', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop layout');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const link = page.getByRole('link', { name: /Rather read\? My résumé is right below/ });
    const disclaimer = page.getByText(
      'AI answers from my résumé and GitHub. It can make mistakes.',
    );
    await expect(disclaimer).toHaveCSS('font-size', '13px');
    // Measure where it settles, after its reveal.
    await link.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    await expect(link).toBeInViewport({ ratio: 1 });
    const box = await link.boundingBox();
    const text = await disclaimer.boundingBox();
    const dock = await page.getByRole('textbox', { name: 'Ask Paul’s agent' }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThan(900 - 32);
    expect(
      Math.abs((text?.y ?? 0) + (text?.height ?? 0) / 2 - (box?.y ?? 0) - (box?.height ?? 0) / 2),
    ).toBeLessThan(4);
    // The row's centre lines up with the page's.
    const left = text?.x ?? 0;
    const right = (box?.x ?? 0) + (box?.width ?? 0);
    expect(Math.abs((left + right) / 2 - 720)).toBeLessThan(4);
    expect(dock).not.toBeNull();
  });

  test('the index sticks at 96px and the phone tabs at 64px, under the header', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/#skills');
    await page.waitForTimeout(200);
    const nav = page.locator('[data-spy]').filter({ visible: true }).first();
    const top = (await nav.boundingBox())?.y ?? 0;
    const header = (await page.getByRole('banner').boundingBox())?.height ?? 0;
    if (isMobile) {
      // The tab strip's wrapper sticks at 64px; the strip sits 10px inside it.
      expect(header).toBe(65); // 64px plus its 1px bottom border
      expect(top).toBeGreaterThanOrEqual(64);
      expect(top).toBeLessThan(64 + 16);
    } else {
      expect(top).toBe(96);
    }
  });

  test('the arrow hops until the visitor scrolls, and holds still on hover', async ({ page }) => {
    // Tall enough that hovering the link doesn't scroll (which would stop the hop).
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const link = page.getByRole('link', { name: /Rather read\? My résumé is right below/ });
    const arrow = link.locator('span').last();
    const state = () =>
      arrow.evaluate((el) => ({
        name: getComputedStyle(el).animationName,
        play: el.getAnimations()[0]?.playState,
      }));
    await expect.poll(async () => (await state()).name).not.toBe('none');
    await link.hover();
    await expect.poll(async () => (await state()).play).toBe('paused');
    // Before the first hop (2.6s), any scroll stops it at once.
    await page.mouse.move(1, 1);
    await page.evaluate(() => window.scrollTo(0, 1));
    await expect.poll(async () => (await state()).name).toBe('none');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    expect((await state()).name).toBe('none');
  });

  test('hovering mid-hop lets the hop land, holds it at rest, then resumes', async ({ page }) => {
    // Tall enough that hovering the link doesn't scroll (which would stop the hop).
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const link = page.getByRole('link', { name: /Rather read\? My résumé is right below/ });
    const arrow = link.locator('span').last();
    const state = () =>
      arrow.evaluate((el) => ({
        play: el.getAnimations()[0]?.playState,
        translate: getComputedStyle(el).translate,
      }));
    await page.waitForTimeout(2800); // the first hop is under way
    await link.hover();
    expect((await state()).play).toBe('running');
    await expect.poll(async () => (await state()).play, { timeout: 2000 }).toBe('paused');
    expect((await state()).translate).toMatch(/^(none|0px)$/); // at rest
    await page.mouse.move(1, 1);
    await expect.poll(async () => (await state()).play).toBe('running');
  });

  test('once hopping, an interaction stops it at the end of the cycle, at rest', async ({
    page,
  }) => {
    await page.goto('/');
    const arrow = page
      .getByRole('link', { name: /Rather read\? My résumé is right below/ })
      .locator('span')
      .last();
    await page.waitForTimeout(3000); // the first hop is under way
    await page.keyboard.press('Shift');
    expect(await arrow.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
    await expect
      .poll(() => arrow.evaluate((el) => getComputedStyle(el).animationName), { timeout: 4000 })
      .toBe('none');
    expect(await arrow.evaluate((el) => getComputedStyle(el).translate)).toBe('none');
  });

  test('the header stays on top and frosts once the page scrolls', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');
    await page.evaluate(() => window.scrollTo(0, 2000));
    await expect(header).toBeInViewport();
    expect((await header.boundingBox())?.y).toBe(0);
    await expect
      .poll(() => header.evaluate((el) => getComputedStyle(el).borderBottomColor))
      .not.toBe('rgba(0, 0, 0, 0)');
  });

  test('anchors land just below the sticky header and the section nav', async ({ page }) => {
    for (const id of ['experience', 'skills', 'education', 'open-source']) {
      await page.goto(`/#${id}`);
      await page.waitForTimeout(300);
      const target = await page.locator(`#${id}`).boundingBox();
      const header = await page.getByRole('banner').boundingBox();
      const tabs = await page.locator('[data-spy]').filter({ visible: true }).first().boundingBox();
      // On phones the section tabs stick under the header; the rail sits beside the content.
      const covered = Math.max(
        header?.height ?? 0,
        tabs && tabs.height < 120 ? tabs.y + tabs.height : 0,
      );
      expect(target?.y, id).toBeGreaterThanOrEqual(covered - 1);
      // The page's end can stop the last sections short of the top.
      if (id !== 'open-source' && id !== 'education') {
        expect(target?.y, id).toBeLessThan(covered + 120);
      }
    }
  });

  test('the ask button: hidden on the first screen, follows the section, hides at the end', async ({
    page,
  }) => {
    await page.goto('/');
    const button = page.locator('button[aria-expanded]').filter({ hasText: /^PVM/ });
    await expect(button).toBeHidden();
    await page.locator('#skills').evaluate((el) => el.scrollIntoView());
    await expect(page.getByRole('button', { name: 'Ask about my skills' })).toBeVisible();
    await page.locator('#experience').evaluate((el) => el.scrollIntoView());
    await expect(page.getByRole('button', { name: 'Ask about my experience' })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(button).toBeHidden();
  });

  test('the chat box question follows the section until the visitor types', async ({ page }) => {
    await page.goto('/#experience');
    await page.getByRole('button', { name: 'Ask about my experience' }).click();
    const box = page.getByRole('dialog');
    const field = box.getByRole('textbox', { name: 'Your question' });
    await expect(field).toHaveValue('What did you lead at SmartThings?');
    await expect(box.getByRole('group', { name: 'Answer as if I’m a' })).toBeVisible();
    await expect(box.getByRole('list', { name: 'Suggested questions' })).toHaveCount(0);

    await page.locator('#skills').evaluate((el) => el.scrollIntoView());
    await expect(box).toHaveAccessibleName('Ask about my skills');
    await expect(field).toHaveValue('Which of these skills do you use most today?');

    await field.fill('Which one did you learn last?');
    await page.locator('#projects').evaluate((el) => el.scrollIntoView());
    await expect(box).toHaveAccessibleName('Ask about my projects');
    await expect(field).toHaveValue('Which one did you learn last?');
  });

  test('Esc closes the chat box and focus returns to the button', async ({ page }) => {
    await page.goto('/#experience');
    const button = page.getByRole('button', { name: 'Ask about my experience' });
    await button.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test('the closing band is fully opaque at the end of the page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => page.locator('[data-ask-cta]').evaluate((el) => getComputedStyle(el).opacity))
      .toBe('1');
  });

  test('the closing band leads back to the dock', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Ask my agent' }).click();
    await expect(page).toHaveURL(/#ask$/);
    await expect(page.getByRole('textbox', { name: 'Ask Paul’s agent' })).toBeFocused();
  });

  // With reduced motion: scrolled this far, the ask panel has receded to 0.35 opacity
  // out of view (it's back to full opacity whenever it's on screen), which axe reads as
  // low contrast. This checks the résumé's real, static colors.
  test('has no axe violations inside the résumé either', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#open-source');
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test.describe('landing without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the visitor persona, pills and dock', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Friend' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'What are your top skills?' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Ask Paul’s agent' })).toBeVisible();
  });

  test('“Rather read?” shows and jumps to the résumé', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /Rather read\? My résumé is right below/ });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/#resume$/);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('“Rather read?” is visible and still, nothing slides', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /Rather read\? My résumé is right below/ });
    await expect(link).toHaveCSS('opacity', '1');
    expect(await link.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    expect(
      await link
        .locator('span')
        .last()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none');
  });

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
