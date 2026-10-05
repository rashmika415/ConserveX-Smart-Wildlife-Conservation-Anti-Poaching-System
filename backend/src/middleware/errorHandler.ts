import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/apiError.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  const malformedJson =
    error instanceof SyntaxError && 'status' in error && error.status === 400;
  const status =
    error instanceof ApiError ? error.status : malformedJson ? 400 : 500;
  const message =
    error instanceof ApiError
      ? error.message
      : malformedJson
        ? 'Invalid JSON body'
        : 'Internal server error';
  if (status === 500) console.error('Unhandled request error', error);
  res.status(status).json({ success: false, message, data: null });
};
