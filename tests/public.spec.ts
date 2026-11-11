import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('a mobile visitor can see when and where the market is and skip navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PaisleyChristmas Market');
  for (const text of ['4–20 December 2026', 'Fri–Sun, 10:00–16:00', 'Paisley High Street']) {
    await expect(page.getByText(text, { exact: true }).first()).toBeInViewport();
  }
  await expect(page.getByRole('main').getByRole('link', { name: 'Plan your visit' })).toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('the programme shows changed, cancelled and closed days', async ({ page }) => {
  await page.goto('/whats-on?day=2026-12-05');
  await expect(page.getByText('New time · previously 12:00')).toBeVisible();
  await page.getByLabel('Programme day').selectOption('2026-12-07');
  await page.getByRole('button', { name: 'Show programme' }).click();
  await expect(page).toHaveURL(/day=2026-12-07/);
  await expect(page.getByText('Closed on this day.')).toBeVisible();
  await page.getByRole('link', { name: 'Fri 11 Dec' }).click();
  await expect(page.getByText('There are no events listed for this day.')).toBeVisible();
  await page.goto('/whats-on?day=2026-12-12');
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
});

test('catalogue filters survive opening a trader and connect to the right stall and day', async ({ page }) => {
  await page.goto('/traders');
  await page.getByRole('searchbox').fill('ceramic');
  await page.getByLabel('Category').selectOption('Craft & gifts');
  await page.getByLabel('Trading day').selectOption('2026-12-19');
  await page.getByRole('button', { name: 'Filter traders' }).click();
  await expect(page.getByRole('status')).toHaveText('1 trader');
  await page.getByRole('link', { name: 'Abbey Clay' }).click();
  await expect(page).toHaveURL(/\/traders\/abbey-clay\?/);
  const traderUrl = page.url();
  await page.getByRole('link', { name: 'Find on the map' }).click();
  await expect(page.getByRole('status')).toContainText('Stall A01');
  await expect(page.getByRole('link', { name: 'Select stall A01' })).toHaveAttribute('aria-current', 'true');
  await expect(page.getByLabel('Trading day')).toHaveValue('2026-12-19');
  await page.goto(traderUrl);
  await page.getByRole('link', { name: 'Back to traders' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('ceramic');
  await expect(page.getByLabel('Trading day')).toHaveValue('2026-12-19');
});

test('account routes redirect to the appropriate sign-in screen', async ({ page }) => {
  await page.goto('/stallholder');
  await expect(page).toHaveURL(/\/sign-in\?area=stallholder$/);
  await expect(page.getByRole('heading', { name: 'Stallholder sign in' })).toBeVisible();
  await page.goto('/organiser');
  await expect(page).toHaveURL(/\/sign-in\?area=organiser$/);
  await expect(page.getByRole('heading', { name: 'Organiser sign in' })).toBeVisible();
  await page.goto('/stallholder/profile');
  await expect(page).toHaveURL(/\/sign-in\?area=stallholder$/);
  await page.goto('/organiser/programme');
  await expect(page).toHaveURL(/\/sign-in\?area=organiser$/);
  await page.goto('/organiser/stalls');
  await expect(page).toHaveURL(/\/sign-in\?area=organiser$/);
});

test('catalogue results stay still when reduced motion is enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/traders?category=Food+%26+drink');
  await expect(page.getByRole('status')).toHaveText('2 traders');
  await expect(page.locator('.reveal')).toHaveCSS('transform', 'none');
  await expect(page.getByRole('link', { name: 'The Fudge Room' })).toBeVisible();
});

test('the public privacy notice explains the demo without setting cookies', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy and cookies' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy and cookies', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How long information stays' })).toBeVisible();
  expect(await context.cookies()).toEqual([]);
});

for (const path of ['/', '/whats-on?day=2026-12-05', '/traders', '/traders/abbey-clay', '/plan-your-visit?stall=A01', '/trade', '/sign-in', '/privacy']) {
  test(`${path} has no horizontal overflow or automated WCAG AA violations at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflows).toBe(false);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations).toEqual([]);
  });
}
