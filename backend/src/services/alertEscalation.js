import { Alert } from '../models/index.js';
import { config } from '../config.js';

export async function escalateOverdueAlerts(now = new Date()) {
  const minutes = config.alertEscalationMinutes;
  if (!Number.isFinite(minutes) || minutes <= 0)
    throw new Error('ALERT_ESCALATION_MINUTES must be a positive number');
  // First detection sets the deadline: repeated readings must not postpone it.
  return Alert.updateMany(
    {
      open: true,
      status: 'New',
      escalatedAt: null,
      createdAt: { $lte: new Date(now.getTime() - minutes * 60000) },
    },
    { $set: { escalatedAt: now } },
  );
}

export function startAlertEscalation() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await escalateOverdueAlerts();
    } catch (error) {
      console.error('Alert escalation failed:', error.message);
    } finally {
      running = false;
    }
  }, 30000);
  timer.unref();
  return () => clearInterval(timer);
}
