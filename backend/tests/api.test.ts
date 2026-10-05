import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/database.js', () => ({
  databaseStatus: vi.fn(() => 'not_configured'),
}));
import { databaseStatus } from '../src/database.js';
import { app } from '../src/app.js';
import { demoUsers, findDemoUser } from '../src/services/demoUsers.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import type { Response } from 'express';

describe('Foundation API', () => {
  it('runs without MongoDB and distinguishes readiness', async () => {
    expect((await request(app).get('/api/health')).body.data.database).toBe(
      'not_configured',
    );
    expect((await request(app).get('/api/ready')).status).toBe(503);
    vi.mocked(databaseStatus).mockReturnValueOnce('connected');
    expect((await request(app).get('/api/ready')).status).toBe(200);
  });
  it('lists all three predefined roles', async () => {
    const response = await request(app).get('/api/demo-users');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(3);
    for (const user of demoUsers)
      expect(findDemoUser(user.userId)).toEqual(user);
  });
  it('returns a demo user and rejects unknown IDs', async () => {
    expect(
      (await request(app).get('/api/demo-users/R001')).body.data.role,
    ).toBe('RANGER');
    const response = await request(app).get('/api/demo-users/unknown');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Demo user not found',
      data: null,
    });
  });
  it('returns consistent errors for unknown routes and malformed JSON', async () => {
    expect((await request(app).get('/api/missing')).body.message).toBe(
      'Route not found',
    );
    const response = await request(app)
      .post('/api/demo-users')
      .set('Content-Type', 'application/json')
      .send('{broken');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid JSON body');
  });
  it('does not expose internal error messages', () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    errorHandler(
      new Error('private database credentials'),
      {} as never,
      res as unknown as Response,
      vi.fn(),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      data: null,
    });
    logger.mockRestore();
  });
});
