import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { ApiError, success } from '../utils/apiError.js';
import { databaseStatus } from '../database.js';
import * as auth from '../controllers/auth.js';
import * as incidents from '../controllers/incidents.js';
import * as patrols from '../controllers/patrols.js';
import * as tracking from '../controllers/tracking.js';
import * as community from '../controllers/community.js';
export const apiRouter = Router();
const manager = authorize('MANAGER');
const ranger = authorize('RANGER');
const field = authorize('MANAGER', 'RANGER');
const office = authorize('MANAGER', 'LIAISON');
const limit = (max, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message, data: null },
  });
apiRouter.get('/health', (_req, res) =>
  success(res, { database: databaseStatus() }),
);
apiRouter.get('/ready', (_req, res) =>
  success(
    res,
    { database: databaseStatus() },
    'Database readiness',
    databaseStatus() === 'connected' ? 200 : 503,
  ),
);
apiRouter.use((_req, _res, next) => {
  if (mongoose.connection.readyState !== 1)
    throw new ApiError(503, 'Database unavailable. Please try again shortly');
  next();
});
apiRouter.post(
  '/auth/login',
  limit(30, 'Too many login attempts. Try again in 15 minutes'),
  auth.login,
);
apiRouter.post(
  '/community-reports',
  limit(50, 'Too many submissions. Try again in 15 minutes'),
  ...upload,
  community.create,
);
apiRouter.use(authenticate);
apiRouter.get('/auth/me', auth.me);
apiRouter.get('/users', manager, auth.users);
apiRouter.post('/incidents', ranger, ...upload, incidents.create);
apiRouter.get('/incidents', field, incidents.list);
apiRouter.get('/incidents/ranger/:rangerId', field, incidents.list);
apiRouter.get('/incidents/:id', field, incidents.details);
apiRouter.patch('/incidents/:id/status', manager, incidents.status);
apiRouter.post('/patrols', manager, patrols.create);
apiRouter.get('/patrols', field, patrols.list);
apiRouter.get('/patrols/ranger/:rangerId', field, patrols.list);
apiRouter.get('/patrols/:id', field, patrols.details);
apiRouter.patch('/patrols/:id/start', ranger, patrols.start);
apiRouter.post('/patrols/:id/waypoints', ranger, ...upload, patrols.waypoint);
apiRouter.patch('/patrols/:id/end', ranger, patrols.end);
apiRouter.get('/animals', manager, tracking.animals);
apiRouter.get('/animals/:id', manager, tracking.animal);
apiRouter.get('/collars', manager, tracking.collars);
apiRouter.get('/risk-zones', manager, tracking.zones);
apiRouter.post('/risk-zones', manager, tracking.createZone);
apiRouter.post('/collar-readings', manager, tracking.reading);
apiRouter.get('/collar-readings/:collarId', manager, tracking.history);
apiRouter.get('/alerts', tracking.alerts);
apiRouter.get('/alerts/:id', tracking.alert);
apiRouter.patch(
  '/alerts/:id/acknowledge',
  authorize('RANGER', 'LIAISON'),
  tracking.acknowledge,
);
apiRouter.patch('/alerts/:id/resolve', manager, tracking.resolve);
apiRouter.get('/community-reports', office, community.list);
apiRouter.get('/community-reports/:id', office, community.details);
apiRouter.patch('/community-reports/:id/status', office, community.status);
apiRouter.post('/community-reports/:id/response', office, community.respond);
