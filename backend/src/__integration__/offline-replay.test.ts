import { randomUUID } from 'crypto';
import request from 'supertest';
import app, { io } from '../app';
import { prisma } from '../lib/prisma';
import { resetDb, seedFixture, Fixture } from './helpers/db';
import { bearer } from './helpers/auth';

// The volunteer app queues submissions while offline and retries them. A retry
// whose first attempt already reached the server must not create a duplicate.

let fx: Fixture;

beforeEach(async () => {
  await resetDb();
  fx = await seedFixture();
});

afterAll(async () => {
  io.close();
  await prisma.$disconnect();
});

const assessment = (clientRef: string) => ({
  address: 'House 9, Street 271', districtId: fx.a.district.id,
  cat1: 5, cat2: 2, cat3: 3, cat4: 1, cat5: 1, clientRef,
});

describe('offline submissions are idempotent', () => {
  it('a retried assessment returns the original household', async () => {
    const ref = randomUUID();
    const first = await request(app).post('/api/households').set(...bearer(fx.users.volunteerA)).send(assessment(ref));
    const retry = await request(app).post('/api/households').set(...bearer(fx.users.volunteerA)).send(assessment(ref));

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.id).toBe(first.body.id);
    expect(await prisma.household.count()).toBe(1);
    expect(await prisma.householdAssessment.count()).toBe(1);
  });

  it('racing retries of the same assessment create one household', async () => {
    const ref = randomUUID();
    const results = await Promise.all(Array.from({ length: 4 }, () =>
      request(app).post('/api/households').set(...bearer(fx.users.volunteerA)).send(assessment(ref))
    ));
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 200, 201]);
    expect(await prisma.household.count()).toBe(1);
  });

  it('a retried incident is stored and announced once', async () => {
    const ref = randomUUID();
    const body = { districtId: fx.a.district.id, type: 'VOLUNTEER_SAFETY', description: 'Water at 85cm, Zone C', clientRef: ref };
    const first = await request(app).post('/api/incidents').set(...bearer(fx.users.volunteerA)).send(body);
    const notificationsAfterFirst = await prisma.notification.count();
    const retry = await request(app).post('/api/incidents').set(...bearer(fx.users.volunteerA)).send(body);

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ id: first.body.id, autoEscalated: true, status: 'ESCALATED' });
    expect(await prisma.incident.count()).toBe(1);
    expect(await prisma.notification.count()).toBe(notificationsAfterFirst);
  });

  it('refuses another user\'s submission reference', async () => {
    const ref = randomUUID();
    await request(app).post('/api/households').set(...bearer(fx.users.volunteerA)).send(assessment(ref));
    const other = await request(app).post('/api/households').set(...bearer(fx.users.hubA)).send(assessment(ref));
    expect(other.status).toBe(409);
  });

  it('rejects a malformed reference', async () => {
    const res = await request(app).post('/api/households').set(...bearer(fx.users.volunteerA)).send(assessment('not-a-uuid'));
    expect(res.status).toBe(400);
  });
});
