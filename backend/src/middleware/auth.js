import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
export async function authenticate(req, _res, next) {
  const token = req.headers.authorization?.split(' ');
  if (token?.[0] !== 'Bearer' || !token[1])
    throw new ApiError(401, 'Please log in to continue');
  let payload;
  try {
    payload = jwt.verify(token[1], config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new ApiError(401, 'Your session expired. Please log in again');
  }
  req.user = await User.findById(payload.sub);
  if (!req.user) throw new ApiError(401, 'Account no longer exists');
  next();
}
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user.role))
      throw new ApiError(403, 'You do not have permission for this action');
    next();
  };
export function ownRecord(record, user) {
  if (
    user.role === 'RANGER' &&
    String(record.rangerId._id || record.rangerId) !== String(user._id)
  )
    throw new ApiError(403, 'This record belongs to another ranger');
  return record;
}
