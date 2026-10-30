import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// Runs against the Worker's scripted mock model (LLM_PROVIDER=mock), so answers are
// deterministic: tools are picked from keywords in the question. That Worker allows 5
// questions per visitor, and every test is its own visitor (x-test-visitor). Tests that
// intercept runs themselves hand them on with route.fallback() to keep that header.

const agentTurns = (page: Page) => page.getByRole('article', { name: 'Paul’s agent' });
const followUps = (page: Page) => page.getByRole('list', { name: 'Follow-up questions' });

// Short screens show fewer suggested prompts, so ask through the dock.
async function askFromLanding(page: Page, question: string) {
  await page.goto('/');
  await askOnLanding(page, question);
}

async function askOnLanding(page: Page, question: string) {
  const dock = page.getByRole('textbox', { name: 'Ask Paul’s agent' });
  await dock.fill(question);
  await dock.press('Enter');
  await expect(page.getByRole('log')).toBeVisible();
}

test.describe('chat', () => {
  test.beforeEach(async ({ page }) => {
    const visitor = crypto.randomUUID();
    await page.route('**/agent/default/run', (route) =>
      route.continue({ headers: { ...route.request().headers(), 'x-test-visitor': visitor } }),
    );
  });

  test('a landing pill opens the chat and renders the card, source and follow-ups', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'What’s your most recent experience?' }).click();
    await expect(page).toHaveURL(/#chat$/);
    await expect(page.getByText('What’s your most recent experience?').last()).toBeVisible();
    const turn = agentTurns(page).first();
    await expect(turn.getByText('Jan 2020 – Jun 2026 · 6 yr 6 mo', { exact: false })).toBeVisible();
    await expect(turn.getByText('from résumé · synced')).toBeVisible();
    await expect(followUps(page).first().getByRole('button')).toHaveCount(2);
  });

  test('follow-ups, typed questions, Back and asking again share one conversation', async ({
    page,
  }) => {
    await askFromLanding(page, 'What are your top skills?');
    await expect(page.getByRole('region', { name: 'Top skills' }).locator('mark')).toHaveText([
      'React',
      'TypeScript',
    ]);

    await followUps(page)
      .first()
      .getByRole('button', { name: 'What have you been up to lately?' })
      .click();
    await expect(page.getByRole('heading', { name: 'Ragoût' })).toBeVisible();
    await expect(followUps(page)).toHaveCount(2);

    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    await input.fill('What certifications do you have?');
    await input.press('Enter');
    await expect(page.getByRole('region', { name: 'Certifications' })).toBeVisible();
    await expect(input).toHaveValue('');

    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: /Hi, I’m/ })).toBeVisible();
    await askOnLanding(page, 'How was this site built?');
    await expect(followUps(page)).toHaveCount(4);
    await expect(agentTurns(page)).toHaveCount(4);
  });

  test('recommendation cards quote the source verbatim', async ({ page }) => {
    await askFromLanding(page, 'What do people say about you?');
    const figure = page.getByRole('figure').filter({ hasText: 'Dr. Luc Julia' });
    await expect(figure.locator('blockquote')).toContainText(
      'he always managed to provide elegant solutions',
    );
    await expect(followUps(page)).toHaveCount(1);
  });

  test('the dock waits while an answer is streaming', async ({ page }) => {
    await askFromLanding(page, 'What do people say about you?');
    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    await expect(page.getByRole('button', { name: 'Send' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await input.fill('What are your top skills?');
    await input.press('Enter');
    await expect(input).toHaveValue('What are your top skills?');
    await expect(followUps(page)).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Send' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    await input.press('Enter');
    await expect(page.getByRole('region', { name: 'Top skills' })).toBeVisible();
  });

  test('contact questions hand off to an email draft', async ({ page }) => {
    await askFromLanding(page, 'What’s your most recent experience?');
    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    await expect(followUps(page)).toHaveCount(1);
    await input.fill('How can I reach you about hiring?');
    await input.press('Enter');
    await expect(page.getByRole('link', { name: 'Open in email' })).toHaveAttribute(
      'href',
      /^mailto:paul@emini\.com\?subject=/,
    );
  });

  test('the selected persona is sent with each run', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the header persona toggle is hidden on phones');
    await askFromLanding(page, 'What are your top skills?');
    await expect(followUps(page)).toHaveCount(1);
    await page.getByRole('banner').getByRole('button', { name: 'Engineer' }).click();
    const request = page.waitForRequest((r) => r.url().includes('/agent/default/run'));
    await followUps(page).first().getByRole('button').first().click();
    expect((await request).postDataJSON().forwardedProps).toEqual({ persona: 'engineer' });
  });

  test('has no axe violations (WCAG 2.2 AA)', async ({ page }) => {
    await askFromLanding(page, 'What do people say about you?');
    await expect(followUps(page)).toHaveCount(1);
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

  test('shows the question right away, before the reply starts', async ({ page }) => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/agent/default/run', async (route) => {
      await held;
      await route.fallback();
    });
    await askFromLanding(page, 'What are your top skills?');
    const log = page.getByRole('log');
    await expect(log.getByText('What are your top skills?')).toBeVisible();
    await expect(log.getByRole('status')).toContainText('Thinking');
    release();
    await expect(followUps(page).first()).toBeVisible();
  });

  test('a failed run keeps the question and offers a retry, without provider details', async ({
    page,
  }) => {
    let fail = true;
    await page.route('**/agent/default/run', async (route) => {
      if (!fail) return route.fallback();
      const events = [
        { type: 'RUN_STARTED', threadId: 't', runId: 'r' },
        { type: 'RUN_ERROR', message: 'The agent is unavailable right now.' },
      ];
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''),
      });
    });
    await askFromLanding(page, 'What are your top skills?');
    const log = page.getByRole('log');
    await expect(log.getByText('What are your top skills?')).toBeVisible();
    await expect(log.getByRole('alert')).toContainText('couldn’t answer');
    fail = false;
    await log.getByRole('button', { name: 'Try again' }).click();
    await expect(followUps(page).first()).toBeVisible();
  });

  test('GitHub activity comes from the daily snapshot', async ({ page }) => {
    await askFromLanding(page, 'What are your top skills?');
    await expect(followUps(page)).toHaveCount(1);
    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    await input.fill('Any GitHub activity?');
    await input.press('Enter');
    const rows = page
      .getByRole('region', { name: 'Open source contributions' })
      .getByRole('listitem');
    await expect(rows).toHaveCount(3);
    await expect(page.getByText(/checked public GitHub · refreshed/)).toBeVisible();
  });

  test('a card link to the résumé closes the chat over it, and the ask button leads back', async ({
    page,
  }) => {
    await askFromLanding(page, 'What’s your most recent experience?');
    await expect(followUps(page)).toHaveCount(1);
    await page.getByRole('textbox', { name: 'Ask a follow-up' }).fill('Tell me about Prism');
    await page.getByRole('textbox', { name: 'Ask a follow-up' }).press('Enter');
    await expect(followUps(page)).toHaveCount(2);
    const details = page.getByRole('link', { name: /Full details on the résumé/ }).last();
    const href = await details.getAttribute('href');
    expect(href).toMatch(/^\/#[a-z0-9-]+$/);
    await expect(details).not.toHaveAttribute('target');
    await details.click();

    const id = href?.slice(2) ?? '';
    await expect(page).toHaveURL(new RegExp(`/#${id}$`));
    await expect(page.getByRole('log')).toBeHidden();
    await expect(page.locator(`#${id} details`)).toHaveAttribute('open', '');
    await expect(page.locator(`#${id}`)).toBeInViewport();

    const back = page.getByRole('button', { name: /Back to our chat/ });
    await expect(back).toContainText('2');
    await back.click();
    await expect(page.getByRole('log')).toBeVisible();
    await expect(agentTurns(page)).toHaveCount(2);
  });

  test('the ask button’s chat box sends through the same path as the dock', async ({ page }) => {
    await page.goto('/#experience');
    const button = page.getByRole('button', { name: 'Ask about my experience' });
    await expect(button).toBeVisible();
    await button.click();
    const box = page.getByRole('dialog', { name: 'Ask about my experience' });
    const field = box.getByRole('textbox', { name: 'Your question' });
    await expect(field).toHaveValue('What did you lead at SmartThings?');
    await expect(field).toBeFocused();
    await box.getByRole('button', { name: 'Send' }).click();
    await expect(page).toHaveURL(/#chat$/);
    await expect(page.getByText('What did you lead at SmartThings?').last()).toBeVisible();
    await expect(followUps(page).first()).toBeVisible();
  });

  test('the agent links to the case study in a new tab', async ({ page }) => {
    await askFromLanding(page, 'What’s your most recent experience?');
    await expect(page.getByRole('link', { name: /Full details on the résumé/ })).toHaveAttribute(
      'href',
      /^\/#smartthings$/,
    );
    await expect(followUps(page)).toHaveCount(1);
    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    await input.fill('Tell me about the Unified Journey');
    await input.press('Enter');
    const study = page.getByRole('link', { name: /Read the case study/ });
    await expect(study).toHaveAttribute('href', /\/work\/unified-journey\/$/);
    await expect(study).toHaveAttribute('target', '_blank');
    await expect(page.getByText(/Named in a launch post by the Head of SmartThings/)).toBeVisible();
  });

  test('off-topic questions get a redirect instead of an answer', async ({ page }) => {
    await askFromLanding(page, 'What are your top skills?');
    await expect(followUps(page)).toHaveCount(1);
    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    await input.fill('Write me a poem about the weather');
    await input.press('Enter');
    const redirect = page.getByRole('list', { name: 'Suggested questions' });
    await expect(redirect).toBeVisible();
    await expect(page.getByText('I’m here to talk about my work')).toBeVisible();
    await redirect.getByRole('button', { name: 'How was this site built?' }).click();
    await expect(followUps(page)).toHaveCount(2);
  });

  test('counts down the daily questions, then hands over to email', async ({ page }) => {
    await askFromLanding(page, 'What are your top skills?');
    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    const footnote = page.getByText(/questions? left today/);
    await expect(footnote).toHaveText('4 questions left today ·');
    for (const [i, left] of [
      '3 questions',
      '2 questions',
      '1 question',
      'No questions',
    ].entries()) {
      await expect(followUps(page)).toHaveCount(i + 1);
      await input.fill('What certifications do you have?');
      await input.press('Enter');
      await expect(footnote).toHaveText(`${left} left today ·`);
    }
    await expect(followUps(page)).toHaveCount(5);
    await input.fill('One more question?');
    await input.press('Enter');
    await expect(page.getByText('That’s all the questions I can answer today')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open in email' })).toBeVisible();
  });

  test('shows the resting card when the agent can’t answer', async ({ page }) => {
    await page.route('**/agent/default/run', async (route) => {
      const call = { toolCallId: 'r', toolCallName: 'agentResting', parentMessageId: 'm' };
      const events = [
        { type: 'RUN_STARTED', threadId: 't', runId: 'r' },
        { type: 'TOOL_CALL_START', ...call },
        { type: 'TOOL_CALL_ARGS', toolCallId: 'r', delta: '{}' },
        { type: 'TOOL_CALL_END', toolCallId: 'r' },
        {
          type: 'TOOL_CALL_RESULT',
          messageId: 'x',
          toolCallId: 'r',
          role: 'tool',
          content: '{"reason":"unavailable"}',
        },
        { type: 'RUN_FINISHED', threadId: 't', runId: 'r' },
      ];
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''),
      });
    });
    await askFromLanding(page, 'What are your top skills?');
    const resting = page
      .getByRole('log')
      .getByRole('status')
      .filter({ hasText: 'The agent is resting' });
    await expect(resting).toContainText('can’t answer right now');
    await expect(resting.getByRole('link', { name: /Download résumé/ })).toBeVisible();
  });

  test('works with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    const pill = page.getByRole('button', { name: 'What are your top skills?' });
    for (let i = 0; i < 40 && !(await pill.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(pill).toBeFocused();
    await page.keyboard.press('Enter');
    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    await expect(input).toBeFocused();
    await expect(followUps(page)).toHaveCount(1);
    await page.keyboard.type('What certifications do you have?');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Certifications' })).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('every control is at least 44px, whatever the cards', async ({ page }) => {
    await askFromLanding(page, 'What have you been up to lately?');
    const input = page.getByRole('textbox', { name: 'Ask a follow-up' });
    for (const [i, q] of [
      'What do people say about you?',
      'How can I reach you about hiring?',
    ].entries()) {
      await expect(followUps(page)).toHaveCount(i + 1);
      await input.fill(q);
      await input.press('Enter');
    }
    await expect(page.getByRole('link', { name: 'Open in email' })).toBeVisible();
    await page.waitForFunction(() =>
      document.getAnimations().every((a) => a.playState !== 'running'),
    );
    await page.waitForTimeout(600); // Motion springs aren't Web Animations
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a, button, input, textarea')]
        // Links inside a sentence are exempt (WCAG 2.5.8).
        .filter((el) => el.offsetParent !== null && !el.closest('p'))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => Math.round(r.width) < 44 || Math.round(r.height) < 44)
        .map(
          ({ el, r }) => `${Math.round(r.width)}x${Math.round(r.height)} ${el.textContent?.trim()}`,
        ),
    );
    expect(small).toEqual([]);
  });

  test('says so when the agent is unreachable, links to the résumé and retries', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'one viewport is enough; this waits for the connection timeout');
    await page.route('**/api/copilotkit/**', (route) => route.abort());
    await askFromLanding(page, 'What are your top skills?');
    const alert = page.getByRole('main', { name: 'Conversation' }).getByRole('alert');
    await expect(alert).toContainText('isn’t reachable', { timeout: 15_000 });

    await alert.getByRole('link', { name: 'Read the résumé' }).click();
    await expect(page).toHaveURL(/#resume$/);
    await expect(page.locator('#resume')).toBeInViewport();

    await page.goBack();
    await page.unroute('**/api/copilotkit/**');
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(alert).toBeHidden();
    await expect(agentTurns(page).first()).toBeVisible({ timeout: 15_000 });
  });

  test('retries a failed human check, then says so and offers another try', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'one viewport is enough');
    // A stand-in for Turnstile that fails (code 600010, a failed challenge) until told not to.
    await page.addInitScript(() => {
      Object.assign(window, { turnstileFails: true, turnstileAttempts: 0 });
    });
    await page.route('https://challenges.cloudflare.com/turnstile/**', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `(() => {
          const widgets = {};
          const attempt = (options) => setTimeout(() => {
            window.turnstileAttempts += 1;
            if (window.turnstileFails) options['error-callback']('600010');
            else options.callback('XXXX.DUMMY.TOKEN.XXXX');
          }, 0);
          let next = 0;
          window.turnstile = {
            render: (el, options) => { const id = String(++next); widgets[id] = options; attempt(options); return id; },
            reset: (id) => attempt(widgets[id]),
            remove: (id) => { delete widgets[id]; },
          };
        })();`,
      }),
    );
    await askFromLanding(page, 'What are your top skills?');
    const alert = page.getByRole('main', { name: 'Conversation' }).getByRole('alert');
    await expect(alert).toContainText('didn’t go through');
    expect(
      await page.evaluate(
        () => (window as unknown as { turnstileAttempts: number }).turnstileAttempts,
      ),
    ).toBe(3);

    await page.evaluate(() => Object.assign(window, { turnstileFails: false }));
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(alert).toBeHidden();
    await expect(agentTurns(page).first()).toBeVisible({ timeout: 15_000 });
  });
});
