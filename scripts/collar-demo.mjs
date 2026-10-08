import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import mongoose from 'mongoose';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createTestDatabase } from '../backend/tests/mongo.js';
import { config } from '../backend/src/config.js';
import { seedDemo } from '../backend/src/services/seed.js';
import { startAlertEscalation } from '../backend/src/services/alertEscalation.js';

// Always use a fresh local database. Never connect to config.mongodbUri.
const checkOnly = process.argv.includes('--check');
const apiPort = 4200;
const webPort = 5175;
const apiUrl = `http://127.0.0.1:${apiPort}/api`;
const webUrl = `http://127.0.0.1:${webPort}`;
config.jwtSecret = randomBytes(48).toString('hex');
config.frontendOrigin = webUrl;
config.alertEscalationMinutes = 0.1;
let mongo, server, vite, stopEscalation;
let cleanupPromise;
function cleanup() {
  return (cleanupPromise ??= (async () => {
    stopEscalation?.();
    if (vite) await vite.close();
    if (server?.listening) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  })());
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    console.log('\nStopping demo and removing the temporary database...');
    cleanup()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error.message);
        process.exit(1);
      });
  });
}

async function request(
  path,
  { token, method = 'GET', body, status = 200 } = {},
) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${result.message}`);
  return result.data;
}
async function login(email, password) {
  return (
    await request('/auth/login', { method: 'POST', body: { email, password } })
  ).token;
}
const pass = (message) => console.log(`  PASS  ${message}`);

try {
  console.log('Starting Member Two demo: disposable MongoDB + API + frontend.');
  console.log(
    'Demo escalation: 6 seconds. Your normal configuration stays unchanged.',
  );
  mongo = await createTestDatabase();
  await mongoose.connect(mongo.getUri('conservex_collar_demo'));
  await seedDemo();
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
  const { app } = await import('../backend/src/app.js');
  server = app.listen(apiPort, '127.0.0.1');
  await once(server, 'listening');
  stopEscalation = startAlertEscalation();
  vite = await createServer({
    root: fileURLToPath(new URL('../frontend', import.meta.url)),
    configFile: false,
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: webPort,
      strictPort: true,
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`,
        '/uploads': `http://127.0.0.1:${apiPort}`,
      },
    },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
  });
  await vite.listen();
  assert.equal((await fetch(webUrl)).status, 200);
  console.log(
    `\nApp: ${webUrl}\nRunning simulations through the actual API...`,
  );
  const manager = await login('manager@wildlife.lk', 'Manager123!');
  const ranger = await login('ranger@wildlife.lk', 'Ranger123!');
  const liaison = await login('officer@wildlife.lk', 'Officer123!');
  const collarId = 'GPS-C118';
  const reading = (body, status = 201) =>
    request('/collar-readings', {
      token: manager,
      method: 'POST',
      body: { collarId, ...body },
      status,
    });
  const zone = await request('/risk-zones', {
    token: manager,
    method: 'POST',
    status: 201,
    body: {
      zoneName: 'Demo origin risk zone',
      centerLatitude: 0,
      centerLongitude: 0,
      radius: 1000,
      riskLevel: 'High',
    },
  });
  pass('Manager creates a high-risk zone covering (0, 0)');
  const safe = await reading({ simulation: 'safe' });
  assert.equal(safe.insideRiskZone, false);
  assert.equal(safe.alerts.length, 0);
  pass(
    `Safe reading chooses (${safe.reading.latitude}, ${safe.reading.longitude}) without an alert`,
  );
  const entry = await reading({ latitude: 0, longitude: 0 });
  const alert = entry.alerts.find((item) => item.zoneId === zone._id);
  assert.ok(alert, 'Risk-zone entry must create an alert');
  pass('Risk-zone entry creates an alert');
  const repeats = await Promise.all(
    Array.from({ length: 3 }, () => reading({ latitude: 0, longitude: 0 })),
  );
  assert.ok(
    repeats.every(
      (item) => item.alerts.length === 1 && item.alerts[0]._id === alert._id,
    ),
  );
  pass('Concurrent repeated readings reuse the same unresolved alert');
  await reading({ collarId: 'INVALID-DEMO-COLLAR', simulation: 'safe' }, 404);
  await reading({ latitude: 100, longitude: 0 }, 400);
  pass('Invalid collar and malformed coordinates are rejected');
  const history = await request(`/collar-readings/${collarId}`, {
    token: manager,
  });
  assert.ok(history.some((item) => item._id === safe.reading._id));
  assert.ok(history.some((item) => item._id === entry.reading._id));
  pass('Safe and risk readings are persisted in location history');

  console.log('  Waiting for the six-second escalation deadline...');
  const waitUntil = Date.now() + 15000;
  let escalated;
  do {
    await delay(1000);
    escalated = await request(`/alerts/${alert._id}`, { token: ranger });
  } while (!escalated.escalatedAt && Date.now() < waitUntil);
  assert.ok(escalated.escalatedAt, 'Unacknowledged alert must escalate');
  pass('Unacknowledged alert gains an escalation timestamp');
  const acknowledged = await request(`/alerts/${alert._id}/acknowledge`, {
    token: ranger,
    method: 'PATCH',
  });
  assert.equal(acknowledged.status, 'Acknowledged');
  assert.equal(acknowledged.escalatedAt, escalated.escalatedAt);
  pass('Ranger acknowledges the escalated alert; audit history is retained');
  const resolved = await request(`/alerts/${alert._id}/resolve`, {
    token: manager,
    method: 'PATCH',
  });
  assert.equal(resolved.status, 'Resolved');
  assert.equal((await reading({ latitude: 0, longitude: 0 })).alerts.length, 0);
  await reading({ simulation: 'safe' });
  const reentry = await reading({ latitude: 0, longitude: 0 });
  assert.notEqual(reentry.alerts[0]._id, alert._id);
  pass('Resolution suppresses repeat alerts until exit and re-entry');
  const cloAck = await request(`/alerts/${reentry.alerts[0]._id}/acknowledge`, {
    token: liaison,
    method: 'PATCH',
  });
  assert.equal(cloAck.status, 'Acknowledged');
  pass('CLO can also acknowledge alerts');

  // Leave a fresh example for the user to inspect and acknowledge in the UI.
  const zones = await request('/risk-zones', { token: manager });
  const village = zones.find(
    (item) => item.zoneName === 'Village Boundary Zone',
  );
  const live = await reading({
    latitude: village.centerLatitude,
    longitude: village.centerLongitude,
  });
  console.log('\nAll collar simulations passed.');
  console.log(`History: ${webUrl}/app/tracking`);
  console.log(`Resolved escalation example: ${webUrl}/app/alerts/${alert._id}`);
  console.log(
    `Live alert to inspect: ${webUrl}/app/alerts/${live.alerts[0]._id}`,
  );
  console.log('Manager: manager@wildlife.lk / Manager123!');
  console.log('Ranger: ranger@wildlife.lk / Ranger123!');
  console.log('CLO: officer@wildlife.lk / Officer123!');
  if (checkOnly) {
    await cleanup();
    console.log('Check complete. Demo services stopped.');
  } else {
    console.log(
      `\nOpen ${webUrl} to explore. Ctrl+C stops everything and discards demo data.`,
    );
  }
} catch (error) {
  console.error(`\nDemo failed: ${error.message}`);
  await cleanup();
  process.exitCode = 1;
}
