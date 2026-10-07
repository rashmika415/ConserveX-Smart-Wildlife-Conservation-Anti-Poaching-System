import { beforeAll, afterAll, describe, test, expect } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestDatabase } from './mongo.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { app } from '../src/app.js';
import { config, uploadsPath } from '../src/config.js';
import { seedDemo } from '../src/services/seed.js';
import { escalateOverdueAlerts } from '../src/services/alertEscalation.js';
import {
  User,
  Incident,
  Patrol,
  Alert,
  Collar,
  CollarReading,
  RiskZone,
  CommunityReport,
} from '../src/models/index.js';
let mongo, users, tokens, outsider;
const files = [];
const auth = (method, url, role = 'RANGER') =>
  request(app)[method](url).set('Authorization', `Bearer ${tokens[role]}`);
const point = { latitude: 6.45, longitude: 81.4 };
const validPatrol = () => ({
  routeName: 'Test boundary route',
  parkName: 'Yala',
  rangerId: String(users.ranger._id),
  scheduledDate: new Date(Date.now() + Math.random() * 1e9).toISOString(),
  checkpoints: [{ name: 'East gate', ...point }],
});
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=',
  'base64',
);
beforeAll(async () => {
  config.jwtSecret = 'test-only-secret-at-least-thirty-two-characters';
  // Never connect tests to the user's configured URI or an external database.
  mongo = await createTestDatabase();
  await mongoose.connect(mongo.getUri('conservex_test'));
  users = await seedDemo();
  outsider = await User.create({
    name: 'Other Ranger',
    email: 'other@wildlife.lk',
    role: 'RANGER',
    password: await bcrypt.hash('Other123!', 4),
  });
  tokens = Object.fromEntries(
    [...Object.values(users), outsider].map((user) => [
      user === outsider ? 'OTHER' : user.role,
      jwt.sign({}, config.jwtSecret, {
        subject: String(user._id),
        expiresIn: '1h',
      }),
    ]),
  );
});
afterAll(async () => {
  await Promise.all(
    files.map((file) =>
      unlink(path.join(uploadsPath, path.basename(file))).catch(() => {}),
    ),
  );
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
describe('Authentication and foundation', () => {
  test('valid login returns JWT and profile, never password hashes', async () => {
    for (const [email, password] of [
      ['manager@wildlife.lk', 'Manager123!'],
      ['ranger@wildlife.lk', 'Ranger123!'],
      ['officer@wildlife.lk', 'Officer123!'],
    ]) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
      expect(response.status).toBe(200);
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.user.password).toBeUndefined();
    }
    const profile = await auth('get', '/api/auth/me');
    expect(profile.body.data.role).toBe('RANGER');
    expect(profile.body.data.password).toBeUndefined();
    expect(
      (await User.findOne({ email: 'ranger@wildlife.lk' }).select('+password'))
        .password,
    ).not.toBe('Ranger123!');
  });
  test('rejects wrong passwords, unknown users, malformed inputs and expired sessions', async () => {
    for (const body of [
      { email: 'ranger@wildlife.lk', password: 'wrong' },
      { email: 'missing@wildlife.lk', password: 'wrong' },
    ])
      expect(
        (await request(app).post('/api/auth/login').send(body)).status,
      ).toBe(401);
    for (const body of [
      { email: 'invalid', password: 'wrong' },
      { email: 'valid@wildlife.lk' },
    ])
      expect(
        (await request(app).post('/api/auth/login').send(body)).status,
      ).toBe(400);
    expect((await request(app).get('/api/incidents')).status).toBe(401);
    expect(
      (
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid')
      ).status,
    ).toBe(401);
    const deleted = jwt.sign({}, config.jwtSecret, {
      subject: String(new mongoose.Types.ObjectId()),
    });
    expect(
      (
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${deleted}`)
      ).status,
    ).toBe(401);
  });
  test('lists staff for managers and enforces role authorization', async () => {
    const response = await auth('get', '/api/users', 'MANAGER');
    expect(response.status).toBe(200);
    expect(response.body.data.every((user) => !user.password)).toBe(true);
    expect((await auth('get', '/api/users')).status).toBe(403);
    expect((await auth('get', '/api/incidents', 'LIAISON')).status).toBe(403);
    expect((await request(app).get('/api/health')).body.data.database).toBe(
      'connected',
    );
    expect((await request(app).get('/api/ready')).status).toBe(200);
    expect((await auth('get', '/api/missing')).status).toBe(404);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .set('Content-Type', 'application/json')
          .send('{bad')
      ).status,
    ).toBe(400);
  });
  test('seed is repeatable and does not erase user reports', async () => {
    const before = await Incident.countDocuments();
    await seedDemo();
    expect(await Incident.countDocuments()).toBe(before);
    expect(await User.countDocuments()).toBe(4);
  });
});
describe('Incident management', () => {
  test('creates a pending simulation report, manager reviews it, ranger sees own history', async () => {
    const response = await auth('post', '/api/incidents').send({
      incidentType: 'Snare / Trap',
      ...point,
      description: 'Wire trap found',
      syncStatus: 'Pending',
      rangerId: outsider._id,
    });
    expect(response.status).toBe(201);
    const incident = response.body.data;
    expect(incident.rangerId).toBe(String(users.ranger._id));
    expect(incident.syncStatus).toBe('Pending');
    const list = await auth('get', `/api/incidents/ranger/${users.ranger._id}`);
    expect(list.body.data.some((item) => item._id === incident._id)).toBe(true);
    expect(
      (await auth('get', `/api/incidents/${incident._id}`, 'MANAGER')).status,
    ).toBe(200);
    expect(
      (
        await auth(
          'patch',
          `/api/incidents/${incident._id}/status`,
          'MANAGER',
        ).send({ status: 'Under Review' })
      ).body.data.status,
    ).toBe('Under Review');
    expect(
      (
        await auth('patch', `/api/incidents/${incident._id}/status`).send({
          status: 'Resolved',
        })
      ).status,
    ).toBe(403);
    expect(
      (await auth('get', `/api/incidents/${incident._id}`, 'OTHER')).status,
    ).toBe(403);
    expect(
      (await auth('get', `/api/incidents/ranger/${outsider._id}`)).status,
    ).toBe(403);
    expect(
      (await auth('get', '/api/incidents', 'OTHER')).body.data,
    ).toHaveLength(0);
  });
  test('rejects missing type, missing/out-of-range coordinates and invalid IDs', async () => {
    for (const body of [
      { ...point },
      { incidentType: 'Other', latitude: 6 },
      { incidentType: 'Other', latitude: 91, longitude: 81 },
      { incidentType: 'Other', latitude: '', longitude: 81 },
      { incidentType: 'Other', ...point, description: {} },
    ])
      expect((await auth('post', '/api/incidents').send(body)).status).toBe(
        400,
      );
    expect((await auth('get', '/api/incidents/not-an-id')).status).toBe(400);
    expect(
      (await auth('get', `/api/incidents/${new mongoose.Types.ObjectId()}`))
        .status,
    ).toBe(404);
    expect(
      (
        await auth('post', '/api/incidents', 'MANAGER').send({
          incidentType: 'Other',
          ...point,
        })
      ).status,
    ).toBe(403);
  });
  test('accepts an optional local photo and rejects disguised non-images', async () => {
    const response = await auth('post', '/api/incidents')
      .field('incidentType', 'Other')
      .field('latitude', '6.45')
      .field('longitude', '81.4')
      .attach('photo', png, {
        filename: 'photo.png',
        contentType: 'image/png',
      });
    expect(response.status).toBe(201);
    files.push(response.body.data.imageUrl);
    expect((await request(app).get(response.body.data.imageUrl)).status).toBe(
      200,
    );
    const invalid = await auth('post', '/api/incidents')
      .field('incidentType', 'Other')
      .attach('photo', Buffer.from('<script>bad</script>'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });
    expect(invalid.status).toBe(400);
    const large = await auth('post', '/api/incidents').attach(
      'photo',
      Buffer.alloc(5 * 1024 * 1024 + 1),
      'large.png',
    );
    expect(large.status).toBe(400);
  });
});
describe('Patrol lifecycle', () => {
  test('manager assigns; ranger starts, reports an incident, records waypoint, ends; manager reads summary', async () => {
    const created = await auth('post', '/api/patrols', 'MANAGER').send(
      validPatrol(),
    );
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    expect(
      (
        await auth('get', `/api/patrols/ranger/${users.ranger._id}`)
      ).body.data.some((p) => p._id === id),
    ).toBe(true);
    expect(
      (await auth('patch', `/api/patrols/${id}/start`)).body.data.status,
    ).toBe('Active');
    expect((await auth('patch', `/api/patrols/${id}/start`)).status).toBe(409);
    expect(
      (
        await auth('post', '/api/incidents').send({
          incidentType: 'Other',
          ...point,
          patrolId: id,
        })
      ).status,
    ).toBe(201);
    const waypoint = await auth('post', `/api/patrols/${id}/waypoints`).send({
      ...point,
      type: 'Wildlife',
      description: 'Herd by water',
    });
    expect(waypoint.body.data.waypoints).toHaveLength(1);
    const ended = await auth('patch', `/api/patrols/${id}/end`).send({
      status: 'Completed',
    });
    expect(ended.body.data.status).toBe('Completed');
    expect(ended.body.data.endTime).toBeTruthy();
    expect(ended.body.data.durationMinutes).toBeGreaterThanOrEqual(0);
    const summary = await auth('get', `/api/patrols/${id}`, 'MANAGER');
    expect(summary.body.data.waypoints[0].description).toBe('Herd by water');
    expect(
      (await auth('patch', `/api/patrols/${id}/end`).send({})).status,
    ).toBe(409);
    expect(
      (
        await auth('post', `/api/patrols/${id}/waypoints`).send({
          ...point,
          type: 'Checkpoint',
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await auth('post', '/api/incidents').send({
          incidentType: 'Other',
          ...point,
          patrolId: id,
        })
      ).status,
    ).toBe(409);
  });
  test('validates assignment, prevents conflicts and protects ownership', async () => {
    expect(
      (await auth('post', '/api/patrols', 'MANAGER').send({})).status,
    ).toBe(400);
    expect(
      (await auth('post', '/api/patrols').send(validPatrol())).status,
    ).toBe(403);
    for (const patch of [
      { scheduledDate: 'invalid' },
      { rangerId: users.manager._id },
      { checkpoints: [] },
      { checkpoints: [{ name: 'Invalid', latitude: 0 }] },
    ])
      expect(
        (
          await auth('post', '/api/patrols', 'MANAGER').send({
            ...validPatrol(),
            ...patch,
          })
        ).status,
      ).toBe(400);
    const body = validPatrol();
    const response = await auth('post', '/api/patrols', 'MANAGER').send(body);
    const id = response.body.data._id;
    expect(
      (await auth('post', '/api/patrols', 'MANAGER').send(body)).status,
    ).toBe(409);
    expect((await auth('get', `/api/patrols/${id}`, 'OTHER')).status).toBe(403);
    expect(
      (await auth('patch', `/api/patrols/${id}/start`, 'OTHER')).status,
    ).toBe(403);
    expect(
      (await auth('get', `/api/patrols/ranger/${outsider._id}`)).status,
    ).toBe(403);
    expect(
      (await auth('patch', `/api/patrols/${id}/end`).send({})).status,
    ).toBe(409);
    expect((await auth('get', '/api/patrols', 'MANAGER')).status).toBe(200);
  });
  test('allows only one active patrol and requires a reason for early termination', async () => {
    const one = (
      await auth('post', '/api/patrols', 'MANAGER').send(validPatrol())
    ).body.data._id;
    const two = (
      await auth('post', '/api/patrols', 'MANAGER').send(validPatrol())
    ).body.data._id;
    expect((await auth('patch', `/api/patrols/${one}/start`)).status).toBe(200);
    expect((await auth('patch', `/api/patrols/${two}/start`)).status).toBe(409);
    expect(
      (
        await auth('patch', `/api/patrols/${one}/end`).send({
          status: 'Incomplete',
        })
      ).status,
    ).toBe(400);
    const end = await auth('patch', `/api/patrols/${one}/end`).send({
      status: 'Incomplete',
      incompleteReason: 'Weather',
    });
    expect(end.body.data.incompleteReason).toBe('Weather');
  });
});
describe('Collar monitoring and alerts', () => {
  test('escalates at the deadline once, preserves history, and excludes handled alerts', async () => {
    const now = new Date();
    const deadline = new Date(
      now.getTime() - config.alertEscalationMinutes * 60000,
    );
    const animalId = (await Collar.findOne({ collarId: 'GPS-C102' })).animalId;
    const fixtures = await Alert.create(
      [
        { createdAt: deadline, status: 'New', open: true },
        {
          createdAt: new Date(deadline.getTime() + 1),
          status: 'New',
          open: true,
        },
        { createdAt: deadline, status: 'Acknowledged', open: true },
        { createdAt: deadline, status: 'Resolved', open: false },
      ].map((value) => ({
        ...value,
        animalId,
        zoneId: new mongoose.Types.ObjectId(),
        lastDetectedAt: now,
      })),
    );
    const ids = fixtures.map((item) => item._id);
    try {
      await Promise.all([
        escalateOverdueAlerts(now),
        escalateOverdueAlerts(now),
      ]);
      const stored = await Promise.all(ids.map((id) => Alert.findById(id)));
      expect(stored[0].escalatedAt).toEqual(now);
      expect(stored[0].status).toBe('New');
      expect(stored.slice(1).every((item) => !item.escalatedAt)).toBe(true);
      await escalateOverdueAlerts(now);
      expect((await Alert.findById(ids[0])).escalatedAt).toEqual(now);
      expect(await Alert.countDocuments({ _id: { $in: ids } })).toBe(4);
      const list = await auth('get', '/api/alerts', 'MANAGER');
      expect(list.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: String(ids[0]),
            escalatedAt: now.toISOString(),
          }),
        ]),
      );
      const details = await auth('get', `/api/alerts/${ids[0]}`, 'LIAISON');
      expect(details.body.data.escalatedAt).toBe(now.toISOString());
      const ack = await auth(
        'patch',
        `/api/alerts/${ids[0]}/acknowledge`,
        'LIAISON',
      );
      expect(ack.status).toBe(200);
      expect(ack.body.data.status).toBe('Acknowledged');
      await escalateOverdueAlerts(new Date(now.getTime() + 3600000));
      expect((await Alert.findById(ids[0])).escalatedAt).toEqual(now);
      const resolved = await auth(
        'patch',
        `/api/alerts/${ids[0]}/resolve`,
        'MANAGER',
      );
      expect(resolved.body.data).toMatchObject({
        status: 'Resolved',
        escalatedAt: now.toISOString(),
      });
      expect((await Alert.findById(ids[2])).escalatedAt).toBeUndefined();
      expect((await Alert.findById(ids[3])).escalatedAt).toBeUndefined();
    } finally {
      await Alert.deleteMany({ _id: { $in: ids } });
    }
  });
  test('alerts only for readings within a risk-zone radius', async () => {
    const zone = await RiskZone.create({
      zoneName: `Boundary test ${Date.now()}`,
      centerLatitude: 0,
      centerLongitude: 0,
      radius: 1000,
      riskLevel: 'High',
    });
    try {
      const outside = await auth(
        'post',
        '/api/collar-readings',
        'MANAGER',
      ).send({
        collarId: 'GPS-C118',
        latitude: 0,
        longitude: 0.0091,
      });
      expect(outside.status).toBe(201);
      expect(outside.body.data.alerts).toHaveLength(0);
      const inside = await auth('post', '/api/collar-readings', 'MANAGER').send(
        {
          collarId: 'GPS-C118',
          latitude: 0,
          longitude: 0.0089,
        },
      );
      expect(inside.status).toBe(201);
      expect(inside.body.data.alerts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ zoneId: String(zone._id) }),
        ]),
      );
    } finally {
      await Alert.deleteMany({ zoneId: zone._id });
      await RiskZone.deleteOne({ _id: zone._id });
    }
  });
  test('manager defines a valid risk zone for future simulated readings', async () => {
    const zoneName = `Test zone ${Date.now()}`;
    const body = {
      zoneName,
      description: 'New test area',
      centerLatitude: 7.25,
      centerLongitude: 80.25,
      radius: 250,
      riskLevel: 'Critical',
    };
    expect((await auth('post', '/api/risk-zones').send(body)).status).toBe(403);
    const created = await auth('post', '/api/risk-zones', 'MANAGER').send(body);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject(body);
    expect((await RiskZone.findOne({ zoneName })).radius).toBe(250);
    expect((await auth('get', '/api/risk-zones', 'MANAGER')).body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ zoneName })]),
    );
    const detected = await auth('post', '/api/collar-readings', 'MANAGER').send(
      {
        collarId: 'GPS-C207',
        latitude: body.centerLatitude,
        longitude: body.centerLongitude,
      },
    );
    expect(detected.status).toBe(201);
    expect(detected.body.data.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ zoneId: created.body.data._id }),
      ]),
    );
    expect(
      (await auth('post', '/api/risk-zones', 'MANAGER').send(body)).status,
    ).toBe(409);
    for (const [index, invalid] of [
      { centerLatitude: '   ' },
      { centerLongitude: 181 },
      { radius: 0 },
      { riskLevel: 'Low' },
      { zoneName: '' },
    ].entries()) {
      expect(
        (
          await auth('post', '/api/risk-zones', 'MANAGER').send({
            ...body,
            zoneName: `${zoneName} invalid ${index}`,
            ...invalid,
          })
        ).status,
      ).toBe(400);
    }
    await Alert.deleteMany({ zoneId: created.body.data._id });
    await RiskZone.deleteOne({ zoneName });
  });
  test('rejects blank collar coordinates before saving a reading', async () => {
    const before = await CollarReading.countDocuments({ collarId: 'GPS-C102' });
    const response = await auth('post', '/api/collar-readings', 'MANAGER').send(
      {
        collarId: 'GPS-C102',
        latitude: '   ',
        longitude: '   ',
      },
    );
    expect(response.status).toBe(400);
    expect(await CollarReading.countDocuments({ collarId: 'GPS-C102' })).toBe(
      before,
    );
  });
  test('saves safe and risk readings, deduplicates alerts and records acknowledgement', async () => {
    await Alert.deleteMany({});
    const safe = await auth('post', '/api/collar-readings', 'MANAGER').send({
      collarId: 'GPS-C102',
      latitude: 0,
      longitude: 0,
    });
    expect(safe.status).toBe(201);
    expect(safe.body.data.alerts).toHaveLength(0);
    const body = { collarId: 'GPS-C102', ...point };
    const risk = await auth('post', '/api/collar-readings', 'MANAGER').send(
      body,
    );
    expect(risk.body.data.alerts).toHaveLength(1);
    const id = risk.body.data.alerts[0]._id;
    const again = await auth('post', '/api/collar-readings', 'MANAGER').send(
      body,
    );
    expect(again.body.data.alerts[0]._id).toBe(id);
    expect(await Alert.countDocuments()).toBe(1);
    const ack = await auth('patch', `/api/alerts/${id}/acknowledge`);
    expect(ack.body.data.status).toBe('Acknowledged');
    expect(ack.body.data.acknowledgedBy).toBe(String(users.ranger._id));
    expect(ack.body.data.acknowledgedAt).toBeTruthy();
    expect(
      (await auth('patch', `/api/alerts/${id}/acknowledge`, 'LIAISON')).status,
    ).toBe(409);
    expect(
      (await auth('post', '/api/collar-readings', 'MANAGER').send(body)).body
        .data.alerts[0].status,
    ).toBe('Acknowledged');
    expect(
      (await auth('get', `/api/alerts/${id}`, 'LIAISON')).body.data
        .acknowledgedBy.name,
    ).toBe(users.ranger.name);
    expect((await auth('patch', `/api/alerts/${id}/resolve`)).status).toBe(403);
    expect(
      (await auth('patch', `/api/alerts/${id}/resolve`, 'MANAGER')).body.data
        .status,
    ).toBe('Resolved');
    expect(
      (await auth('patch', `/api/alerts/${id}/resolve`, 'MANAGER')).status,
    ).toBe(409);
    const stillInside = await auth(
      'post',
      '/api/collar-readings',
      'MANAGER',
    ).send(body);
    expect(stillInside.status).toBe(201);
    expect(stillInside.body.data.insideRiskZone).toBe(true);
    expect(stillInside.body.data.alerts).toHaveLength(0);
    expect(await Alert.countDocuments()).toBe(1);
    const exit = await auth('post', '/api/collar-readings', 'MANAGER').send({
      collarId: body.collarId,
      latitude: 0,
      longitude: 0,
    });
    expect(exit.body.data.insideRiskZone).toBe(false);
    const reentry = await auth('post', '/api/collar-readings', 'MANAGER').send(
      body,
    );
    expect(reentry.status).toBe(201);
    expect(reentry.body.data.alerts[0]._id).not.toBe(id);
    expect(
      (
        await auth(
          'patch',
          `/api/alerts/${reentry.body.data.alerts[0]._id}/acknowledge`,
          'LIAISON',
        )
      ).status,
    ).toBe(200);
    expect(
      (await auth('get', '/api/collar-readings/GPS-C102', 'MANAGER')).body.data
        .length,
    ).toBeGreaterThan(3);
    expect(
      (await Collar.findOne({ collarId: 'GPS-C102' })).lastLocation.latitude,
    ).toBe(point.latitude);
  });
  test('handles concurrent detections without duplicate unresolved alerts', async () => {
    const body = { collarId: 'GPS-C118', ...point };
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        auth('post', '/api/collar-readings', 'MANAGER').send(body),
      ),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(new Set(results.map((r) => r.body.data.alerts[0]._id)).size).toBe(1);
  });
  test('rejects invalid collar, inactive collar, invalid GPS, and unauthorized simulations', async () => {
    expect(
      (
        await auth('post', '/api/collar-readings', 'MANAGER').send({
          collarId: 'missing',
          ...point,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await auth('post', '/api/collar-readings').send({
          collarId: 'GPS-C102',
          ...point,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await auth('post', '/api/collar-readings', 'MANAGER').send({
          collarId: 'GPS-C102',
          latitude: 100,
          longitude: 0,
        })
      ).status,
    ).toBe(400);
    await Collar.updateOne({ collarId: 'GPS-C207' }, { status: 'Inactive' });
    expect(
      (
        await auth('post', '/api/collar-readings', 'MANAGER').send({
          collarId: 'GPS-C207',
          ...point,
        })
      ).status,
    ).toBe(409);
    expect((await auth('get', '/api/alerts')).status).toBe(200);
    expect(
      (await auth('get', '/api/risk-zones', 'MANAGER')).body.data,
    ).toHaveLength(3);
    expect(
      (await auth('get', '/api/collars', 'MANAGER')).body.data,
    ).toHaveLength(3);
    const animals = await auth('get', '/api/animals', 'MANAGER');
    expect(animals.body.data).toHaveLength(3);
    expect(
      (await auth('get', `/api/animals/${animals.body.data[0]._id}`, 'MANAGER'))
        .body.data.collar.collarId,
    ).toBeTruthy();
  });
});
describe('Public community reporting and officer response', () => {
  test('submits without login, preserves privacy, records response actor and status', async () => {
    const response = await request(app).post('/api/community-reports').send({
      landmark: 'Village school',
      numberOfElephants: 3,
      description: 'Moving east',
      contact: '0770000000',
    });
    expect(response.status).toBe(201);
    const id = response.body.data._id;
    expect(response.body.data.contact).toBeUndefined();
    expect(
      (await request(app).get(`/api/community-reports/${id}`)).status,
    ).toBe(401);
    expect((await auth('get', `/api/community-reports/${id}`)).status).toBe(
      403,
    );
    expect(
      (await auth('get', `/api/community-reports/${id}`, 'LIAISON')).body.data
        .contact,
    ).toBe('0770000000');
    const action = await auth(
      'post',
      `/api/community-reports/${id}/response`,
      'LIAISON',
    ).send({ action: 'Monitor Situation', notes: 'Ranger team informed' });
    expect(action.body.data.responses[0].responder).toBe(
      String(users.liaison._id),
    );
    expect(
      (
        await auth(
          'patch',
          `/api/community-reports/${id}/status`,
          'MANAGER',
        ).send({ status: 'Responding' })
      ).body.data.status,
    ).toBe('Responding');
    expect(
      (await auth('get', '/api/community-reports', 'MANAGER')).body.data.some(
        (r) => r._id === id,
      ),
    ).toBe(true);
    expect(
      (
        await auth(
          'post',
          `/api/community-reports/${id}/response`,
          'LIAISON',
        ).send({ action: 'Invalid' })
      ).status,
    ).toBe(400);
  });
  test('rejects missing landmark, invalid counts and partial coordinates', async () => {
    for (const body of [
      { numberOfElephants: 2 },
      { landmark: 'School', numberOfElephants: 0 },
      { landmark: 'School', numberOfElephants: 1.5 },
      { landmark: 'School', numberOfElephants: 2, latitude: 6 },
    ])
      expect(
        (await request(app).post('/api/community-reports').send(body)).status,
      ).toBe(400);
    const valid = await request(app)
      .post('/api/community-reports')
      .field('landmark', 'River crossing')
      .field('numberOfElephants', '2')
      .field('latitude', '6.4')
      .field('longitude', '81.3')
      .attach('photo', png, 'sighting.png');
    expect(valid.status).toBe(201);
    const saved = await CommunityReport.findById(valid.body.data._id);
    files.push(saved.imageUrl);
    expect(saved.location.latitude).toBe(6.4);
  });
});
