import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createTestDatabase } from './mongo.js';

const run = promisify(execFile);
let mongo;
let client;
beforeAll(async () => {
  mongo = await createTestDatabase();
  client = new mongoose.mongo.MongoClient(mongo.getUri('seed_startup_test'));
  await client.connect();
});
afterAll(async () => {
  if (client) await client.close();
  if (mongo) await mongo.stop();
});

test('actual seed entry point initializes collections and indexes, and can run twice', async () => {
  const script = fileURLToPath(
    new URL('../src/scripts/seed.js', import.meta.url),
  );
  for (let attempt = 0; attempt < 2; attempt++) {
    const { stdout } = await run(process.execPath, [script], {
      env: { ...process.env, MONGODB_URI: mongo.getUri('seed_startup_test') },
      timeout: 30000,
    });
    expect(stdout).toContain('Demo data ready');
  }
  const db = client.db('seed_startup_test');
  expect(await db.collection('users').countDocuments()).toBe(3);
  expect(await db.collection('animals').countDocuments()).toBe(3);
  expect(await db.collection('patrols').countDocuments()).toBe(2);
  expect(await db.collection('alerts').countDocuments()).toBe(1);
  const indexes = await db.collection('alerts').indexes();
  expect(indexes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { open: true },
      }),
    ]),
  );
});
