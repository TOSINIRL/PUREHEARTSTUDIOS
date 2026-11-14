import { test, expect } from './fixtures.mjs';

async function openBooking(page) {
    await page.goto('/');
    await page.locator('.calendar-day.available').first().click();
    return page.getByRole('combobox', { name: 'Choose a service', exact: true });
}

test('branded service picker saves the choice in the real booking form', async ({ page }, testInfo) => {
    const picker = await openBooking(page);
    await picker.click();
    const list = page.getByRole('listbox', { name: 'Hair services' });
    await expect(list).toBeVisible();
    await expect(list.getByRole('option')).toHaveCount(9);
    await page.getByRole('option', { name: 'Single Braids', exact: true }).click();
    await expect(page.locator('#service')).toHaveValue('box_braids');
    await expect(picker).toContainText('Single Braids');
    expect(await page.locator('#bookingForm').evaluate(form => new FormData(form).get('service'))).toBe('box_braids');
    await expect(list).toBeHidden();
    await picker.click();
    await expect(page.getByRole('option', { name: 'Single Braids', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.waitForTimeout(450);
    await page.screenshot({ path: `generated-artifacts/service-picker-${testInfo.project.name}.png` });
});

test('service picker supports keyboard selection and layered Escape', async ({ page }) => {
    const picker = await openBooking(page);
    await picker.focus();
    await picker.press('ArrowDown');
    await picker.press('s');
    await picker.press('Enter');
    await expect(page.locator('#service')).toHaveValue('box_braids');
    await picker.press('ArrowDown');
    await picker.press('End');
    await picker.press('Enter');
    await expect(page.locator('#service')).toHaveValue('short_braids');
    await picker.click();
    await picker.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(page.locator('#bookingModal')).toHaveClass(/active/);
    await expect(picker).toBeFocused();
    await picker.press('Escape');
    await expect(page.locator('#bookingModal')).not.toHaveClass(/active/);
    await expect(page.locator('.calendar-day.available').first()).toBeFocused();
});

test('required service validation focuses the custom picker without sending email', async ({ page }) => {
    const picker = await openBooking(page);
    await page.locator('#email').fill('test@example.com');
    await page.locator('#name').fill('UI Test');
    await page.locator('#time').selectOption('10:00 AM');
    await page.getByRole('button', { name: 'Confirm Booking', exact: true }).click();
    await expect(picker).toBeFocused();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.getByRole('listbox').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});
