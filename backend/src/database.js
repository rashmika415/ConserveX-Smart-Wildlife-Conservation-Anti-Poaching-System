import mongoose from 'mongoose';
import { config } from './config.js';
// Keep Mongoose's default buffering: models are imported before connectDatabase(),
// and their automatic collection/index initialization must wait for the connection.
export const databaseStatus = () =>
  mongoose.connection.readyState === 1
    ? 'connected'
    : config.mongodbUri
      ? 'disconnected'
      : 'not_configured';
export async function connectDatabase() {
  if (!config.mongodbUri)
    throw new Error('Set MONGODB_URI in backend/.env before starting.');
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
}
