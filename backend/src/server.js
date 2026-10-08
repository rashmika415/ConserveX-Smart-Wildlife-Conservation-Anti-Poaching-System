import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';
import { connectDatabase } from './database.js';
import {
  escalateOverdueAlerts,
  startAlertEscalation,
} from './services/alertEscalation.js';
try {
  if (config.jwtSecret.length < 32)
    throw new Error('Set JWT_SECRET to at least 32 characters in backend/.env');
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
    throw new Error('PORT must be between 1 and 65535');
  await connectDatabase();
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
  await escalateOverdueAlerts();
  const stopEscalation = startAlertEscalation();
  const server = app.listen(config.port, () =>
    console.info(`ConserveX API: http://localhost:${config.port}`),
  );
  const shutdown = () => {
    stopEscalation();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Startup failed:', error.message);
  process.exit(1);
}
