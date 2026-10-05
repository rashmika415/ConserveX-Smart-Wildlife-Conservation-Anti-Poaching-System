import mongoose from 'mongoose';
import { config } from '../config.js';
import { connectDatabase } from '../database.js';
import { seedDemoUsers } from '../repositories/users.js';

try {
  if (!config.mongodbUri) throw new Error('Missing MongoDB configuration');
  await connectDatabase();
  await seedDemoUsers();
  console.info('Demo users seeded: R001, M001, C001');
} catch {
  console.error(
    'Seeding failed. Set a valid MONGODB_URI in backend/.env and check database access.',
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
