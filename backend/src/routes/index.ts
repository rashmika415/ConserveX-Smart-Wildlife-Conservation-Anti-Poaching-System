import { Router } from 'express';
import { databaseStatus } from '../database.js';
import { listUsers, getUser } from '../controllers/demoUsers.js';

export const apiRouter = Router();
apiRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    data: { database: databaseStatus() },
  });
});
apiRouter.get('/ready', (_req, res) => {
  const database = databaseStatus();
  const ready = database === 'connected';
  res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? 'Database is ready' : 'Database is not ready',
    data: { database },
  });
});
apiRouter.get('/demo-users', listUsers);
apiRouter.get('/demo-users/:userId', getUser);
// Mount incidents, collars, patrols and community routers here as they are implemented.
