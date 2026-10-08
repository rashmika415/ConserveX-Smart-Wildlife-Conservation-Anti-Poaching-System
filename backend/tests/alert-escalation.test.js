import { afterEach, expect, jest, test } from '@jest/globals';
import { Alert } from '../src/models/index.js';
import { config } from '../src/config.js';
import {
  escalateOverdueAlerts,
  startAlertEscalation,
} from '../src/services/alertEscalation.js';

const originalMinutes = config.alertEscalationMinutes;
afterEach(() => {
  config.alertEscalationMinutes = originalMinutes;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test.each([0, -1, NaN, Infinity])(
  'rejects invalid escalation duration %s',
  async (minutes) => {
    config.alertEscalationMinutes = minutes;
    await expect(escalateOverdueAlerts()).rejects.toThrow('positive number');
  },
);

test('worker runs without viewers, skips overlapping work, recovers from failure and stops', async () => {
  jest.useFakeTimers();
  let finish;
  const update = jest
    .spyOn(Alert, 'updateMany')
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockRejectedValueOnce(new Error('Database unavailable'))
    .mockResolvedValue({ modifiedCount: 0 });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const stop = startAlertEscalation();
  await jest.advanceTimersByTimeAsync(30000);
  expect(update).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(30000);
  expect(update).toHaveBeenCalledTimes(1);
  finish({ modifiedCount: 1 });
  await jest.advanceTimersByTimeAsync(30000);
  expect(log).toHaveBeenCalledWith(
    'Alert escalation failed:',
    'Database unavailable',
  );
  await jest.advanceTimersByTimeAsync(30000);
  expect(update).toHaveBeenCalledTimes(3);
  stop();
  await jest.advanceTimersByTimeAsync(60000);
  expect(update).toHaveBeenCalledTimes(3);
});
