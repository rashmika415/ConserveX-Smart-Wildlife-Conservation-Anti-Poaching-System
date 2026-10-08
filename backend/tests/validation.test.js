import { describe, test, expect, jest } from '@jest/globals';
import {
  text,
  number,
  choice,
  location,
  date,
} from '../src/utils/validation.js';
import { distanceMeters } from '../src/services/tracking.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
describe('Validation and distance boundaries', () => {
  test('requires bounded text and supports optional text', () => {
    expect(text(' ranger ', 'Name')).toBe('ranger');
    expect(text('', 'Note', false)).toBe('');
    for (const value of [null, '', ' ', 5, {}, 'abcd'])
      expect(() => text(value, 'Name', true, 3)).toThrow();
  });
  test('rejects coercible non-numbers and validates paired coordinates', () => {
    for (const value of [
      null,
      '',
      '   ',
      false,
      [],
      {},
      Infinity,
      'NaN',
      91,
      -91,
    ])
      expect(() => number(value, 'Latitude', -90, 90)).toThrow();
    expect(() => location({ latitude: '   ', longitude: '   ' })).toThrow();
    expect(number('0', 'Latitude', -90, 90)).toBe(0);
    expect(location({ location: { latitude: -90, longitude: 180 } })).toEqual({
      latitude: -90,
      longitude: 180,
    });
    expect(location({}, true)).toBeUndefined();
    expect(() => choice('bad', ['good'], 'status')).toThrow();
    expect(choice('good', ['good'], 'status')).toBe('good');
    expect(() => date('', 'Date')).toThrow();
    expect(date('2026-10-06', 'Date')).toBeInstanceOf(Date);
  });
  test('Haversine distance uses metres, including zero and antipodal points', () => {
    expect(distanceMeters(6.45, 81.4, 6.45, 81.4)).toBe(0);
    expect(distanceMeters(0, 0, 0, 1)).toBeCloseTo(111194.93, 1);
    expect(distanceMeters(0, 0, 0, 180)).toBeCloseTo(20015086.8, 0);
  });
  test('centralized errors hide private messages and translate database/upload failures', () => {
    const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(new Error('private credentials'), {}, response, () => {});
    expect(response.status).toHaveBeenLastCalledWith(500);
    expect(response.json.mock.lastCall[0].message).not.toContain('private');
    for (const [error, status] of [
      [{ code: 11000 }, 409],
      [
        { name: 'ValidationError', errors: { field: { message: 'Required' } } },
        400,
      ],
      [{ name: 'MulterError', code: 'LIMIT_UNEXPECTED_FILE' }, 400],
    ]) {
      errorHandler(error, {}, response, () => {});
      expect(response.status).toHaveBeenLastCalledWith(status);
    }
    logger.mockRestore();
  });
});
