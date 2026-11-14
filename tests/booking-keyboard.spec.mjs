import { test, expect } from './fixtures.mjs';

const modal = page => page.locator('#bookingModal');
const dialog = page => page.getByRole('dialog', { name: 'Complete Your Booking', exact: true });
const closeButton = page => page.getByRole('button', { name: 'Close booking dialog' });
const dateButton = (page, iso = '2025-12-03') =>
  page.locator(`.calendar-day.available[data-date="${iso}"]`);

async function openWithKeyboard(page, { key = 'Enter', iso = '2025-12-03' } = {}) {
  const day = dateButton(page, iso);
  await day.focus();
  await expect(day).toBeFocused();
  await page.keyboard.press(key);
  await expect(dialog(page)).toBeVisible();
  await expect(closeButton(page)).toBeFocused();
  return day;
}

async function expectDismissed(page, day, overflow = '') {
  await expect(modal(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(modal(page)).toHaveJSProperty('inert', true);
  await expect(day).toBeFocused();
  await expect.poll(() => page.locator('body').evaluate(body => body.style.overflow))
    .toBe(overflow);
  await expect(modal(page)).toBeHidden();
}

test.describe('Booking keyboard controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  for (const [key, iso, label] of [
    ['Enter', '2025-12-03', 'December 3, 2025'],
    ['Space', '2025-12-31', 'December 31, 2025'],
  ]) {
    test(`${key} activates a named calendar date and focuses the dialog close button`, async ({ page }) => {
      const day = dateButton(page, iso);
      await expect(day).toHaveRole('button');
      await expect(day).toHaveAccessibleName(`Book ${label}`);
      await expect(day).toHaveAttribute('tabindex', '0');
      await expect(day).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(day).toHaveAttribute('aria-controls', 'bookingModal');
      await expect(modal(page)).toHaveJSProperty('inert', true);
      await openWithKeyboard(page, { key, iso });
      await expect(dialog(page)).toHaveAccessibleName('Complete Your Booking');
      await expect(dialog(page)).toHaveAccessibleDescription(`Selected Date: ${label}`);
      await expect(dialog(page)).toHaveAttribute('aria-modal', 'true');
      await expect(modal(page)).not.toHaveAttribute('aria-hidden', 'true');
      await expect(modal(page)).toHaveJSProperty('inert', false);
      await expect(page.locator('#selectedDateDisplay')).toHaveText(label);
      await page.keyboard.press('Escape');
      await expectDismissed(page, day);
    });
  }

  test('Tab and Shift+Tab visit every control and wrap in both directions', async ({ page }) => {
    await openWithKeyboard(page);
    const controls = [
      closeButton(page),
      page.getByLabel('Email Address', { exact: true }),
      page.getByLabel('Preferred Time', { exact: true }),
      page.getByLabel('Full Name', { exact: true }),
      page.getByLabel('Service', { exact: true }),
      page.getByRole('button', { name: 'Confirm Booking', exact: true }),
    ];
    for (const control of [...controls.slice(1), controls[0]]) {
      await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
    }
    for (const control of [...controls.slice(1).reverse(), controls[0]]) {
      await page.keyboard.press('Shift+Tab');
      await expect(control).toBeFocused();
    }
    // The dialog container is programmatically focusable but not a Tab stop.
    await dialog(page).focus();
    await page.keyboard.press('Tab');
    await expect(controls[0]).toBeFocused();
    await dialog(page).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(controls.at(-1)).toBeFocused();
  });

  for (const method of ['Escape', 'close button', 'backdrop']) {
    test(`${method} dismisses the dialog and restores the exact triggering date`, async ({ page }) => {
      await page.locator('body').evaluate(body => { body.style.overflow = 'scroll'; });
      const day = await openWithKeyboard(page, { iso: '2025-12-19' });
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
      if (method === 'Escape') {
        await page.getByLabel('Full Name', { exact: true }).focus();
        await page.keyboard.press('Escape');
      } else if (method === 'close button') {
        await page.keyboard.press('Enter');
      } else {
        // Clicking inside must not be mistaken for a backdrop dismissal.
        await page.getByRole('heading', { name: 'Complete Your Booking' }).click();
        await expect(dialog(page)).toBeVisible();
        await modal(page).click({ position: { x: 5, y: 5 } });
      }
      await expectDismissed(page, day, 'scroll');
      await expect(page.locator('#booking')).toHaveJSProperty('inert', false);
      await page.keyboard.press('Tab');
      await expect(dateButton(page, '2025-12-20')).toBeFocused();
    });
  }

  test('background is inert while open and its prior inert state is restored', async ({ page }) => {
    // Preserve an already-inert sibling, not just the usual all-false state.
    await page.locator('footer').evaluate(element => { element.inert = true; });
    const before = await page.evaluate(() => Array.from(document.body.children)
      .filter(element => element.id !== 'bookingModal' && !['SCRIPT', 'STYLE'].includes(element.tagName))
      .map(element => element.inert));
    const day = await openWithKeyboard(page);
    await expect.poll(() => page.evaluate(() => Array.from(document.body.children)
      .filter(element => element.id !== 'bookingModal' && !['SCRIPT', 'STYLE'].includes(element.tagName))
      .every(element => element.inert))).toBe(true);
    // Native inert must prevent even programmatic focus from leaving the dialog.
    await day.evaluate(element => element.focus());
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expectDismissed(page, day);
    const after = await page.evaluate(() => Array.from(document.body.children)
      .filter(element => element.id !== 'bookingModal' && !['SCRIPT', 'STYLE'].includes(element.tagName))
      .map(element => element.inert));
    expect(after).toEqual(before);
    await page.getByRole('link', { name: 'Book Your Appointment' }).focus();
    await expect(page.getByRole('link', { name: 'Book Your Appointment' })).toBeFocused();
  });

  test('rapid reopen cancels the old hide timer and retains keyboard control', async ({ page }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await openWithKeyboard(page);
    await page.keyboard.press('Escape');
    await expect(modal(page)).toHaveAttribute('aria-hidden', 'true');
    // Reopen a different date before the 300ms closing timeout can run.
    const latestDay = await openWithKeyboard(page, { key: 'Space', iso: '2025-12-30' });
    await page.clock.runFor(350);
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toHaveAccessibleDescription('Selected Date: December 30, 2025');
    await expect(closeButton(page)).toBeFocused();
    await expect(page.locator('#booking')).toHaveJSProperty('inert', true);
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Confirm Booking' })).toBeFocused();
    await page.keyboard.press('Escape');
    await page.clock.runFor(350);
    await expectDismissed(page, latestDay);
    await expect(page.locator('#booking')).toHaveJSProperty('inert', false);
  });
});

test.describe('Booking keyboard controls with stubbed delivery', () => {
  test.use({ expectedEmailCalls: 1 });

  test('disabled submit is skipped in both directions; success dismisses and restores focus', async ({ page, emailStub }) => {
    await page.goto('/');
    const day = await openWithKeyboard(page, { iso: '2025-12-08' });
    await page.getByLabel('Email Address', { exact: true }).fill('keyboard-test@example.invalid');
    await page.getByLabel('Preferred Time', { exact: true }).selectOption('10:00 AM');
    await page.getByLabel('Full Name', { exact: true }).fill('Keyboard Test');
    const service = page.getByLabel('Service', { exact: true });
    await service.selectOption('retwist');
    const submit = page.locator('#bookingForm button[type="submit"]');
    await submit.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => emailStub.calls.length).toBe(1);
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText('Sending...');
    expect(emailStub.calls[0][2]).toMatchObject({
      from_email: 'keyboard-test@example.invalid',
      date: 'December 8, 2025',
    });
    await service.focus();
    await page.keyboard.press('Tab');
    await expect(closeButton(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(service).toBeFocused();
    await dialog(page).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(service).toBeFocused();
    emailStub.succeed();
    await expect(submit).toHaveText('Booking Confirmed! ✓');
    await expectDismissed(page, day);
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveText('Confirm Booking');
    await expect(page.locator('#booking')).toHaveJSProperty('inert', false);
    // Success must leave a usable form and no stale focus trap for the next visit.
    await page.keyboard.press('Enter');
    await expect(closeButton(page)).toBeFocused();
    await expect(page.getByLabel('Email Address', { exact: true })).toHaveValue('');
    await page.keyboard.press('Escape');
    await expectDismissed(page, day);
  });
});
