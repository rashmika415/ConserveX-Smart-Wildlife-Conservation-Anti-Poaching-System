import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';
import { connectDatabase } from './database.js';

try {
  await connectDatabase();
  const server = app.listen(config.port, () =>
    console.info(`ConserveX API: http://localhost:${config.port}/api`),
  );
  const shutdown = () => {
    server.close(() => {
      void mongoose.disconnect().then(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch {
  console.error(
    'Database connection failed. Check MONGODB_URI and database network access.',
  );
  process.exitCode = 1;
}
