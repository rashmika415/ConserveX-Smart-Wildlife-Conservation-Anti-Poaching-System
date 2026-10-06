import mongoose from 'mongoose';
import { connectDatabase } from '../database.js';
import { seedDemo } from '../services/seed.js';
try {
  await connectDatabase();
  await seedDemo();
  console.info('Demo data ready. See README for the three demo accounts.');
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
