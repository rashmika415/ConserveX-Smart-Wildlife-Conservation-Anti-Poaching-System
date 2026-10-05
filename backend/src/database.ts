import mongoose from 'mongoose';
import { config } from './config.js';

export function databaseStatus() {
  if (!config.mongodbUri) return 'not_configured';
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
export async function connectDatabase() {
  if (!config.mongodbUri) {
    console.info(
      'MongoDB is not configured. Add MONGODB_URI to backend/.env and restart.',
    );
    return;
  }
  mongoose.set('bufferCommands', false);
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  console.info('MongoDB connected');
}
