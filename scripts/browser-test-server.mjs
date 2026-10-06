import mongoose from 'mongoose';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { createTestDatabase } from '../backend/tests/mongo.js';
import { config } from '../backend/src/config.js';
import { seedDemo } from '../backend/src/services/seed.js';
// This harness always seeds a disposable local database, never the configured URI.
config.jwtSecret = 'browser-test-only-secret-longer-than-thirty-two-characters';
config.frontendOrigin = 'http://localhost:5174';
const mongo = await createTestDatabase();
await mongoose.connect(mongo.getUri('conservex_browser_test'));
await seedDemo();
const { app } = await import('../backend/src/app.js');
const api = app.listen(4100, '127.0.0.1');
const vite = await createServer({
  root: fileURLToPath(new URL('../frontend', import.meta.url)),
  configFile: false,
  plugins: [(await import('@vitejs/plugin-react')).default()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:4100',
      '/uploads': 'http://127.0.0.1:4100',
    },
  },
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
});
await vite.listen();
console.log('Isolated browser demo ready at http://127.0.0.1:5174');
async function stop() {
  await vite.close();
  await new Promise((resolve) => api.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
