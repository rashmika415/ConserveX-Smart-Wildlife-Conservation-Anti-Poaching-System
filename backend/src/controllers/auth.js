import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { config } from '../config.js';
import { ApiError, success } from '../utils/apiError.js';
import { text } from '../utils/validation.js';
export async function login(req, res) {
  const email = text(req.body.email, 'Email', true, 254).toLowerCase();
  const password = text(req.body.password, 'Password', true, 128);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ApiError(400, 'Enter a valid email address');
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new ApiError(401, 'Email or password is incorrect');
  const token = jwt.sign({}, config.jwtSecret, {
    subject: String(user._id),
    expiresIn: '8h',
    algorithm: 'HS256',
  });
  const profile = user.toObject();
  delete profile.password;
  success(res, { token, user: profile }, 'Logged in successfully');
}
export const me = (req, res) => success(res, req.user);
export const users = async (_req, res) =>
  success(res, await User.find().sort({ name: 1 }));
