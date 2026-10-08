const { test, expect } = require('@playwright/test');

for (const [role, email, password, width] of [
  ['manager', 'manager@wildlife.lk', 'Manager123!', 1440],
  ['ranger', 'ranger@wildlife.lk', 'Ranger123!', 390],
  ['liaison', 'officer@wildlife.lk', 'Officer123!', 390],
]) {
  test(`alert notifications work for ${role} at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/login');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);
    const bell = page.getByRole('button', {
      name: /Alert notifications, 1 awaiting/,
    });
    await expect(bell).toBeVisible();
    await bell.click();
    const panel = page.getByRole('region', { name: 'Alert notifications' });
    await expect(panel.getByRole('listitem')).toHaveCount(1);
    const box = await panel.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `test-results/${role}-notifications.png`,
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
    await expect(bell).toBeFocused();
    await bell.click();
    const item = panel.getByRole('listitem').getByRole('link');
    const destination = await item.getAttribute('href');
    await item.click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(panel).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Alert details' }),
    ).toBeVisible();
  });
}
