const { test, expect } = require('@playwright/test');
async function login(page, role) {
  await page.goto('/login');
  const users = {
    manager: ['manager', 'Manager123!'],
    ranger: ['ranger', 'Ranger123!'],
    liaison: ['officer', 'Officer123!'],
  };
  await page.getByLabel('Email address').fill(`${users[role][0]}@wildlife.lk`);
  await page.getByLabel('Password').fill(users[role][1]);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /overview|workspace/,
  );
}
async function logout(page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/login/);
}
test('all four persisted flows connect public users, manager, ranger and liaison', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page, 'manager');
  await expect(page.getByText('Active patrols', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'test-results/manager-dashboard.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Create patrol', exact: true }).click();
  await page.getByLabel('Route name').fill('Browser test eastern sweep');
  await page.getByLabel('Scheduled date and time').fill('2026-10-07T08:00');
  await page.getByLabel('Assign ranger').selectOption({ label: 'Kasun Silva' });
  await page.getByLabel('Checkpoint 1 name').fill('Eastern gate');
  await page.getByLabel('Latitude', { exact: false }).fill('6.45');
  await page.getByLabel('Longitude', { exact: false }).fill('81.4');
  await page.getByRole('button', { name: 'Create & assign patrol' }).click();
  await expect(
    page.getByRole('heading', { name: 'Browser test eastern sweep' }),
  ).toBeVisible();
  const patrolUrl = page.url();
  await logout(page);
  await login(page, 'ranger');
  await page.goto(patrolUrl);
  await page.getByRole('button', { name: 'Start Patrol', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Record waypoint' }),
  ).toBeVisible();
  await page.getByLabel('Waypoint type').selectOption('Wildlife');
  await page.getByLabel('Latitude', { exact: false }).fill('6.45');
  await page.getByLabel('Longitude', { exact: false }).fill('81.4');
  await page
    .getByLabel('Description (optional)')
    .fill('Elephant herd at checkpoint');
  await page.getByRole('button', { name: 'Save waypoint' }).click();
  await expect(
    page.getByText('Waypoint recorded', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Report incident on this patrol' })
    .click();
  await page.getByLabel('Incident type').selectOption('Snare / Trap');
  await page.getByLabel('Latitude', { exact: false }).fill('6.45');
  await page.getByLabel('Longitude', { exact: false }).fill('81.4');
  await page.getByLabel('Description (optional)').fill('Browser test incident');
  await page.getByLabel('Simulate Offline').check();
  await page.getByRole('button', { name: 'Submit incident report' }).click();
  await expect(
    page.getByRole('heading', { name: 'Incident reported successfully' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'View incident history' }).click();
  await expect(
    page.getByText('Browser test incident', { exact: true }),
  ).toBeVisible();
  await page.goto(patrolUrl);
  await page.getByRole('button', { name: 'End Patrol', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirm', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Patrol summary · recorded waypoints' }),
  ).toBeVisible();
  await expect(
    page.getByText('Elephant herd at checkpoint', { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, 'manager');
  await page.getByRole('link', { name: 'Incidents', exact: true }).click();
  await page
    .getByRole('link')
    .filter({ hasText: 'Browser test incident' })
    .click();
  await page.getByLabel('Incident status').selectOption('Under Review');
  await page.getByRole('button', { name: 'Save status' }).click();
  await expect(
    page.getByText('Incident status updated.', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Animal Tracking', exact: true })
    .click();
  await page.getByLabel('GPS collar').selectOption('GPS-C118');
  await page.getByRole('button', { name: 'Simulate Collar Reading' }).click();
  await expect(page.getByRole('status')).toContainText('no alert generated');
  await page
    .getByLabel('Simulated location')
    .selectOption({ label: 'Main Road Crossing · Critical' });
  await page.getByRole('button', { name: 'Simulate Collar Reading' }).click();
  await page.getByRole('link', { name: 'View alert →' }).click();
  const alertUrl = page.url();
  await expect(page.getByText('GPS-C118', { exact: true })).toBeVisible();
  await logout(page);
  await login(page, 'liaison');
  await page.goto(alertUrl);
  await page.getByRole('button', { name: 'Acknowledge alert' }).click();
  await expect(
    page.getByText('Alert acknowledged', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('dd').filter({ hasText: 'Amali Fernando' }),
  ).toBeVisible();
  await logout(page);
  await page.goto('/report');
  await page
    .getByLabel('Nearest location / landmark')
    .fill('Browser test village bridge');
  await page.getByLabel('Number of elephants').fill('4');
  await page.getByLabel('Direction of movement').fill('East');
  await page.getByRole('button', { name: 'Submit sighting report' }).click();
  await expect(
    page.getByText('Thank you for looking out for wildlife.'),
  ).toBeVisible();
  await login(page, 'liaison');
  await page
    .getByRole('link', { name: 'Community Reports', exact: true })
    .click();
  await page
    .getByRole('link')
    .filter({ hasText: 'Browser test village bridge' })
    .click();
  await page.getByLabel('Response action').selectOption('Monitor Situation');
  await page
    .getByLabel('Response notes')
    .fill('Field team contacted for observation');
  await page
    .getByRole('button', { name: 'Record response', exact: true })
    .click();
  await expect(
    page.getByText('Response action recorded', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.timeline')).toContainText(
    'Field team contacted for observation',
  );
  await page.getByLabel('Report status').selectOption('Responding');
  await page.getByRole('button', { name: 'Save status' }).click();
  await expect(
    page.getByText('Report status updated', { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile public reporting and staff navigation fit the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/report', '/login']) {
    await page.goto(route);
    await expect(page.getByRole('heading').first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await login(page, 'ranger');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('link', { name: 'Report Incident', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Report an incident' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/mobile-incident-form.png',
    fullPage: true,
  });
});
