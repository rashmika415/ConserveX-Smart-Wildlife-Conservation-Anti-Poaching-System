const { test, expect } = require('@playwright/test');

async function loginAsRanger(page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('ranger@wildlife.lk');
  await page.getByLabel('Password').fill('Ranger123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test.describe('ranger incident management', () => {
  test('validates required fields and supports GPS with manual fallback', async ({
    context,
    page,
  }) => {
    await context.grantPermissions(['geolocation'], {
      origin: 'http://127.0.0.1:5174',
    });
    await context.setGeolocation({ latitude: 6.451234, longitude: 81.412345 });
    await loginAsRanger(page);
    await page.goto('/app/incidents/new');

    await expect(page.getByText('Draft', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Short description')).toHaveAttribute(
      'required',
      '',
    );
    await expect(page.getByLabel('Photograph (optional)')).not.toHaveAttribute(
      'required',
      '',
    );

    await page
      .getByRole('button', { name: 'Submit and synchronize report' })
      .click();
    await expect(page.getByLabel('Incident type')).toBeFocused();
    expect(
      await page
        .getByLabel('Incident type')
        .evaluate((field) => field.validity.valueMissing),
    ).toBe(true);

    await page.getByRole('button', { name: 'Use my current location' }).click();
    await expect(page.getByLabel('Latitude', { exact: false })).toHaveValue(
      '6.451234',
    );
    await expect(page.getByLabel('Longitude', { exact: false })).toHaveValue(
      '81.412345',
    );

    // Coordinates remain editable when GPS is denied or unavailable.
    await page.getByLabel('Latitude', { exact: false }).fill('6.460000');
    await page.getByLabel('Longitude', { exact: false }).fill('81.420000');
    await expect(page.getByLabel('Latitude', { exact: false })).toHaveValue(
      '6.460000',
    );
  });

  test('saves locally offline and automatically retries through every sync state', async ({
    context,
    page,
  }) => {
    await loginAsRanger(page);
    await page.goto('/app/incidents/new');
    await context.setOffline(true);
    await expect(
      page.getByText(/Offline.*saved only on this device/),
    ).toBeVisible();

    const description = `Offline snare report ${Date.now()}`;
    await page.getByLabel('Incident type').selectOption('Snare / Trap');
    await page.getByLabel('Latitude', { exact: false }).fill('6.450001');
    await page.getByLabel('Longitude', { exact: false }).fill('81.400001');
    await page.getByLabel('Short description').fill(description);
    await page
      .getByRole('button', { name: 'Save report on this device' })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Incident saved on this device' }),
    ).toBeVisible();
    await expect(
      page.getByText('Saved locally', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/manager cannot see it yet/)).toBeVisible();

    await page.getByRole('link', { name: 'View my incident history' }).click();
    const report = page.getByRole('link').filter({ hasText: description });
    await expect(report).toBeVisible();
    await expect(
      report.getByText('Saved locally', { exact: true }),
    ).toBeVisible();

    await page.route('**/api/incidents', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      await route.continue();
    });
    await context.setOffline(false);

    await expect(
      report.getByText('Pending sync', { exact: true }),
    ).toBeVisible();
    await expect(report.getByText('Synced', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Saved locally', { exact: true })).toHaveCount(
      0,
    );
  });
});
