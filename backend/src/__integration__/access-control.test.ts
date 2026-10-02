import request from 'supertest';
import { AddressInfo } from 'net';
import { io as ioClient } from 'socket.io-client';
import app, { httpServer, io } from '../app';
import { prisma } from '../lib/prisma';
import { resetDb, seedFixture, createHouseholds, Fixture } from './helpers/db';
import { bearer, tokenFor } from './helpers/auth';

// PROJECT_SCOPE §7 — who may write what, and in which district.

let fx: Fixture;

beforeEach(async () => {
  await resetDb();
  fx = await seedFixture();
});

afterAll(async () => {
  io.close();
  await prisma.$disconnect();
});

const startRunIn = (which: 'a' | 'b') => prisma.deliveryRun.create({
  data: {
    subWarehouseId: fx[which].subWarehouse.id, teamNumber: 1, zone: 'A',
    departedAt: new Date(), leadVolunteerId: fx.leadVolunteer.id, performedById: fx.users.admin.id,
  },
});

describe('VIEWER is read-only', () => {
  it.each([
    ['post', '/api/households',     () => ({ districtId: fx.a.district.id, address: 'x', cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 })],
    ['post', '/api/incidents',      () => ({ districtId: fx.a.district.id, type: 'OTHER', description: 'x' })],
    ['post', '/api/radio/checkin',  () => ({ districtId: fx.a.district.id, scheduledTime: 'T0800', status: 'OK' })],
    ['post', '/api/stock/dispatch', () => ({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 1 })],
    ['post', '/api/alert/trigger',  () => ({ condition: 'warningLevelTwo' })],
    ['post', '/api/route/update',   () => ({ districtId: fx.a.district.id, zone: 'A', waterDepthCm: 10 })],
  ] as const)('%s %s → 403', async (method, url, body) => {
    const res = await request(app)[method](url).set(...bearer(fx.users.viewer)).send(body());
    expect(res.status).toBe(403);
  });

  it('can still read', async () => {
    const res = await request(app).get('/api/stock/status').set(...bearer(fx.users.viewer));
    expect(res.status).toBe(200);
  });
});

describe('activation trigger', () => {
  it('rejects HUB_MANAGER and VOLUNTEER', async () => {
    for (const user of [fx.users.hubA, fx.users.volunteerA]) {
      const res = await request(app).post('/api/alert/trigger').set(...bearer(user)).send({ condition: 'warningLevelTwo' });
      expect(res.status).toBe(403);
    }
  });

  it('records who confirmed each condition', async () => {
    const res = await request(app).post('/api/alert/trigger')
      .set(...bearer(fx.users.coordinator)).send({ condition: 'warningLevelTwo' });
    expect(res.status).toBe(200);

    const status = await request(app).get('/api/alert/status').set(...bearer(fx.users.viewer));
    expect(status.body.conditionReports).toEqual([
      expect.objectContaining({ condition: 'warningLevelTwo', reportedBy: { name: 'coordinator', role: 'EMERGENCY_COORDINATOR' } }),
    ]);
  });

  it('activates exactly once when two conditions are confirmed at the same time', async () => {
    await Promise.all([
      request(app).post('/api/alert/trigger').set(...bearer(fx.users.coordinator)).send({ condition: 'warningLevelTwo' }),
      request(app).post('/api/alert/trigger').set(...bearer(fx.users.admin)).send({ condition: 'rainfallExceeds100mm' }),
    ]);
    const alert = await prisma.floodAlert.findFirstOrThrow();
    expect(alert.activated).toBe(true);
    expect(alert.phase).toBe(1);
    // one ACTIVATION notification per recipient (hubA, hubB, coordinator, admin) — not two batches
    expect(await prisma.notification.count({ where: { type: 'ACTIVATION' } })).toBe(4);
  });
});

describe('HUB_MANAGER is limited to their own district', () => {
  it('stock: dispatch / adjust own sub-warehouse only', async () => {
    const own = await request(app).post('/api/stock/dispatch').set(...bearer(fx.users.hubA))
      .send({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 1 });
    expect(own.status).toBe(200);

    const other = await request(app).post('/api/stock/dispatch').set(...bearer(fx.users.hubA))
      .send({ subWarehouseId: fx.b.subWarehouse.id, emkType: 'EMK1', quantity: 1 });
    expect(other.status).toBe(403);

    const adjust = await request(app).post('/api/stock/adjust').set(...bearer(fx.users.hubA))
      .send({ subWarehouseId: fx.b.subWarehouse.id, emkType: 'EMK1', quantity: -5, reason: 'x' });
    expect(adjust.status).toBe(403);
  });

  it('reallocation: may send surplus out, may not pull from another district', async () => {
    const out = await request(app).post('/api/stock/reallocate').set(...bearer(fx.users.hubA))
      .send({ fromSubWarehouseId: fx.a.subWarehouse.id, toSubWarehouseId: fx.b.subWarehouse.id, emkType: 'EMK1', quantity: 1 });
    expect(out.status).toBe(200);

    const pull = await request(app).post('/api/stock/reallocate').set(...bearer(fx.users.hubA))
      .send({ fromSubWarehouseId: fx.b.subWarehouse.id, toSubWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 1 });
    expect(pull.status).toBe(403);
  });

  it('delivery runs, incidents and households in another district → 403', async () => {
    const runB = await startRunIn('b');
    const incidentB = await prisma.incident.create({
      data: { districtId: fx.b.district.id, type: 'OTHER', description: 'x', reportedById: fx.users.hubB.id },
    });
    const [householdB] = await createHouseholds(fx.b.district.id, 1);

    const responses = await Promise.all([
      request(app).patch(`/api/delivery/runs/${runB.id}/complete`).set(...bearer(fx.users.hubA)),
      request(app).patch(`/api/delivery/runs/${runB.id}/abort`).set(...bearer(fx.users.hubA)).send({ reason: 'x' }),
      request(app).patch(`/api/incidents/${incidentB.id}/resolve`).set(...bearer(fx.users.hubA)),
      request(app).patch(`/api/households/${householdB.id}`).set(...bearer(fx.users.hubA)).send({ cat1: 1 }),
      request(app).post('/api/route/update').set(...bearer(fx.users.hubA)).send({ districtId: fx.b.district.id, zone: 'A', waterDepthCm: 10 }),
      request(app).post('/api/volunteers').set(...bearer(fx.users.hubA)).send({ districtId: fx.b.district.id, name: 'x', phone: '1' }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403]);
  });

  it('can complete a run in their own district', async () => {
    const runA = await startRunIn('a');
    const res = await request(app).patch(`/api/delivery/runs/${runA.id}/complete`).set(...bearer(fx.users.hubA));
    expect(res.status).toBe(200);
  });
});

describe('VOLUNTEER can do field work in their own district only', () => {
  it('assessment: own district 201, other district 403', async () => {
    const body = { address: 'x', cat1: 2, cat2: 1, cat3: 1, cat4: 1, cat5: 1 };
    const own = await request(app).post('/api/households').set(...bearer(fx.users.volunteerA))
      .send({ ...body, districtId: fx.a.district.id });
    expect(own.status).toBe(201);

    const other = await request(app).post('/api/households').set(...bearer(fx.users.volunteerA))
      .send({ ...body, districtId: fx.b.district.id });
    expect(other.status).toBe(403);
  });

  it('delivery receipt on another district\'s run → 403', async () => {
    const runB = await startRunIn('b');
    const [householdB] = await createHouseholds(fx.b.district.id, 1);
    const res = await request(app).post('/api/delivery/receipts').set(...bearer(fx.users.volunteerA))
      .send({ deliveryRunId: runB.id, householdId: householdB.id, emkType: 'EMK1', deliveredAt: new Date().toISOString() });
    expect(res.status).toBe(403);
  });

  it('cannot start or complete runs', async () => {
    const res = await request(app).post('/api/delivery/runs').set(...bearer(fx.users.volunteerA))
      .send({ subWarehouseId: fx.a.subWarehouse.id, teamNumber: 1, zone: 'A', leadVolunteerId: fx.leadVolunteer.id });
    expect(res.status).toBe(403);
  });
});

describe('EMERGENCY_COORDINATOR works across districts', () => {
  it('dispatches to any district and resolves any incident', async () => {
    const incidentB = await prisma.incident.create({
      data: { districtId: fx.b.district.id, type: 'OTHER', description: 'x', reportedById: fx.users.hubB.id },
    });
    const dispatch = await request(app).post('/api/stock/dispatch').set(...bearer(fx.users.coordinator))
      .send({ subWarehouseId: fx.b.subWarehouse.id, emkType: 'EMK1', quantity: 1 });
    const resolve = await request(app).patch(`/api/incidents/${incidentB.id}/resolve`).set(...bearer(fx.users.coordinator));
    expect([dispatch.status, resolve.status]).toEqual([200, 200]);
  });
});

describe('socket.io handshake', () => {
  let url: string;

  beforeAll((done) => {
    httpServer.listen(0, () => {
      url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
      done();
    });
  });

  afterAll((done) => {
    httpServer.close(() => done());
  });

  const connect = (token?: string) => new Promise<string>((resolve) => {
    const socket = ioClient(url, { auth: token ? { token } : {}, transports: ['websocket'], reconnection: false });
    socket.on('connect', () => { socket.close(); resolve('connected'); });
    socket.on('connect_error', (err) => { socket.close(); resolve(err.message); });
  });

  it('rejects connections without a valid token', async () => {
    expect(await connect()).toBe('unauthorized');
    expect(await connect('not-a-jwt')).toBe('unauthorized');
  });

  it('accepts a valid access token', async () => {
    expect(await connect(tokenFor(fx.users.viewer))).toBe('connected');
  });
});
