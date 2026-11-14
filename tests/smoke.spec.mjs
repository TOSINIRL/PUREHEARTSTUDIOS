import { test, expect } from './fixtures.mjs';

const availableDay = page => page.locator('.calendar-day.available').first();
const dialog = page => page.getByRole('dialog', { name: 'Complete Your Booking' });

async function expectNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function expectBookingDate(page, day) {
  const isoDate = await day.getAttribute('data-date');
  const expected = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${isoDate}T12:00:00Z`));
  await day.click();
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('#selectedDateDisplay')).toHaveText(expected);
  await expect(page.locator('#bookingModal')).not.toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expectNoOverflow(page);
}

test.describe('Responsive layout', () => {
  for (const width of [320, 375, 390, 480, 768, 769, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'Viewport matrix runs once');
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      // Exercise scroll reveals and layout throughout the page, not just the hero.
      for (const selector of ['#home', '#services', '#pricing', '#booking', '#contact']) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        await expectNoOverflow(page);
      }
      await expectBookingDate(page, availableDay(page));
    });
  }
});

test('mobile menu opens, toggles closed, and closes after navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only navigation');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  const menu = page.locator('#site-navigation');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).not.toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toBeVisible();
  await expectNoOverflow(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).not.toBeVisible();
  await toggle.click();
  await menu.getByRole('link', { name: 'Services', exact: true }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).not.toBeVisible();
  await expect(page.locator('#services')).toBeInViewport();
});

test('every service preselects the matching booking option', async ({ page }) => {
  // Nine animated scroll/open/close flows need more than the per-test default.
  test.setTimeout(60_000);
  await page.goto('/');
  const buttons = page.locator('.select-service-btn');
  expect(await buttons.count()).toBeGreaterThan(0);
  for (const button of await buttons.all()) {
    const service = await button.getAttribute('data-service');
    expect(service).toBeTruthy();
    await button.click();
    await expect(page.locator('#booking')).toBeInViewport();
    await expectBookingDate(page, availableDay(page));
    await expect(page.getByLabel('Service', { exact: true })).toHaveValue(service);
    await page.getByRole('button', { name: 'Close booking dialog' }).click();
    await expect(page.locator('#bookingModal')).toBeHidden();
  }
});

test('calendar dates open the correct dialog; close and backdrop restore the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#bookingModal')).toBeHidden();
  await expect(page.locator('#bookingModal')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('.calendar-day.unavailable').first().click();
  await expect(page.locator('#bookingModal')).toBeHidden();
  await expectBookingDate(page, availableDay(page));
  await expect(page.getByLabel('Service', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Close booking dialog' }).click();
  await expect(page.locator('#bookingModal')).toBeHidden();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expectBookingDate(page, page.locator('.calendar-day.available').last());
  await page.locator('#bookingModal').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#bookingModal')).toBeHidden();
  await expect(page.locator('#bookingModal')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('service strip pause and resume change the actual animation state', async ({ page }) => {
  await page.goto('/');
  const strip = page.locator('.style-strip');
  const track = page.locator('.style-strip-track');
  // The accessible name changes after each click; keep the locator stable.
  const toggle = page.locator('.strip-toggle');
  await strip.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(track).toHaveCSS('animation-name', 'studio-strip');
  await expect(toggle).toHaveAccessibleName('Pause moving service strip');
  await expect(track).toHaveCSS('animation-play-state', 'running');
  const animationTime = () => track.evaluate(element => element.getAnimations()[0].currentTime);
  const start = await animationTime();
  await expect.poll(animationTime).toBeGreaterThan(start);
  await toggle.click();
  await expect(strip).toHaveAttribute('data-paused', 'true');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAccessibleName('Resume moving service strip');
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await toggle.click();
  await expect(strip).toHaveAttribute('data-paused', 'false');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAccessibleName('Pause moving service strip');
  // Hover/focus intentionally pause too; move away AND blur before asserting resume.
  await toggle.blur();
  await page.mouse.move(0, 0);
  await expect(track).toHaveCSS('animation-play-state', 'running');
  const resumed = await animationTime();
  await expect.poll(animationTime).toBeGreaterThan(resumed);
});

test('service strip also pauses on hover and keyboard focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Hover requires a fine pointer');
  await page.goto('/');
  const strip = page.locator('.style-strip');
  const track = page.locator('.style-strip-track');
  const toggle = page.locator('.strip-toggle');
  await strip.hover();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await page.mouse.move(0, 0);
  await expect(track).toHaveCSS('animation-play-state', 'running');
  await toggle.focus();
  await expect(track).toHaveCSS('animation-play-state', 'paused');
  await toggle.blur();
  await expect(track).toHaveCSS('animation-play-state', 'running');
});

test.describe('Reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('disables decorative motion without hiding content or breaking booking', async ({ page }) => {
    await page.goto('/');
    for (const selector of ['.hero-photo', '.hero-line > span', '.hero-footer', '.style-strip-track']) {
      for (const element of await page.locator(selector).all()) {
        await expect(element).toHaveCSS('animation-name', 'none');
        await expect(element).toHaveCSS('opacity', '1');
      }
    }
    await expect(page.locator('.hero-photo')).toHaveCSS('transform', 'none');
    await expect(page.locator('.style-strip-track')).toHaveCSS('transform', 'none');
    await expect(page.locator('.strip-toggle')).toBeHidden();
    await expect(page.locator('.reveal-pending')).toHaveCount(0);
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
    await page.evaluate(() => {
      const scrollTo = window.scrollTo.bind(window);
      window.__smokeScrollBehaviors = [];
      window.scrollTo = (...args) => {
        window.__smokeScrollBehaviors.push(args[0]?.behavior);
        return scrollTo(...args);
      };
    });
    await page.locator('.cta-button').click();
    await page.locator('.select-service-btn').first().click();
    expect(await page.evaluate(() => window.__smokeScrollBehaviors)).toEqual(['auto', 'auto']);
    await expectBookingDate(page, availableDay(page));
    await expect(page.locator('#service')).toHaveValue('retwist');
    await expect(page.locator('.hero')).toHaveCSS('--hero-shift', '0px');
    await page.getByRole('button', { name: 'Close booking dialog' }).click();
    await expect(page.locator('#bookingModal')).toBeHidden();
    await expectNoOverflow(page);
  });
});

test('switching to reduced motion stops parallax and the moving strip', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
  if (testInfo.project.name === 'desktop') {
    await expect.poll(() => page.locator('.hero').evaluate(element =>
      parseFloat(getComputedStyle(element).getPropertyValue('--hero-shift')))).toBeGreaterThan(0);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.hero')).toHaveCSS('--hero-shift', '0px');
  await expect(page.locator('.style-strip-track')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.strip-toggle')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.strip-toggle')).toBeVisible();
  await expect(page.locator('.style-strip-track')).toHaveCSS('animation-name', 'studio-strip');
});
