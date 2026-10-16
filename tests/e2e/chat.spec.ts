import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// Runs against the Worker's scripted mock model (LLM_PROVIDER=mock), so answers are
// deterministic: tools are picked from keywords in the question.

const agentTurns = (page: Page) => page.getByRole('article', { name: 'Paul’s agent' });
const followUps = (page: Page) => page.getByRole('list', { name: 'Follow-up questions' });

async function askFromLanding(page: Page, pill: string) {
  await page.goto('/');
  await page.getByRole('button', { name: pill }).click();
  await expect(page.getByRole('log')).toBeVisible();
}

test.describe('chat', () => {
  test('a landing pill opens the chat and renders the card, source and follow-ups', async ({
    page,
  }) => {
    await askFromLanding(page, 'What’s your most recent experience?');
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
    await page.getByRole('button', { name: 'How was this site built?' }).click();
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

  test('says so when the agent is unreachable', async ({ page, isMobile }) => {
    test.skip(isMobile, 'one viewport is enough; this waits for the connection timeout');
    await page.route('**/api/copilotkit/**', (route) => route.abort());
    await askFromLanding(page, 'What are your top skills?');
    await expect(page.getByRole('main', { name: 'Conversation' }).getByRole('alert')).toContainText(
      'isn’t reachable',
      { timeout: 15_000 },
    );
  });
});
