import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});
export const config = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI?.trim() || '',
  jwtSecret: process.env.JWT_SECRET || '',
  alertEscalationMinutes: Number(process.env.ALERT_ESCALATION_MINUTES || 15),
};
export const uploadsPath = fileURLToPath(
  new URL('../uploads/', import.meta.url),
);
