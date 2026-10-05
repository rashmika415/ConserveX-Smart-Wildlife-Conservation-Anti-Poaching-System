import type { Request, Response } from 'express';
import { demoUsers, findDemoUser } from '../services/demoUsers.js';

export function listUsers(_req: Request, res: Response) {
  res.json({
    success: true,
    message: 'Predefined demo users',
    data: demoUsers,
  });
}
export function getUser(req: Request, res: Response) {
  const user = findDemoUser(String(req.params.userId));
  res.json({ success: true, message: 'Demo user found', data: user });
}
