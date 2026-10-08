import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, uploadsPath } from './config.js';
import { apiRouter } from './routes/index.js';
import { ApiError } from './utils/apiError.js';
import { errorHandler } from './middleware/errorHandler.js';
export const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  if (
    req.body !== undefined &&
    (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
  )
    throw new ApiError(400, 'Request body must be an object');
  req.body ??= {};
  next();
});
app.use(
  '/uploads',
  express.static(uploadsPath, { dotfiles: 'deny', index: false }),
);
app.use('/api', apiRouter);
app.use((_req, _res, next) => next(new ApiError(404, 'Route not found')));
app.use(errorHandler);
