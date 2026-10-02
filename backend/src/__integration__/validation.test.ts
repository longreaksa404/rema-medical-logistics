import request from 'supertest';
import app, { io } from '../app';
import { prisma } from '../lib/prisma';
import { resetDb, seedFixture, createHouseholds, Fixture } from './helpers/db';
import { bearer } from './helpers/auth';

let fx: Fixture;

beforeEach(async () => {
  await resetDb();
  fx = await seedFixture();
});

afterAll(async () => {
  io.close();
  await prisma.$disconnect();
});

const dispatch = (body: object) =>
  request(app).post('/api/stock/dispatch').set(...bearer(fx.users.admin)).send(body);

describe('request validation', () => {
  it('rejects a non-numeric quantity instead of writing NaN', async () => {
    const res = await dispatch({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([expect.objectContaining({ path: 'quantity' })]);
    const stock = await prisma.stock.findUniqueOrThrow({ where: { subWarehouseId: fx.a.subWarehouse.id } });
    expect(stock.emk1Remaining).toBe(100);
  });

  it('still accepts numeric strings (Swagger / form posts)', async () => {
    const res = await dispatch({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: '5' });
    expect(res.status).toBe(200);
    expect(res.body.stock.emk1Remaining).toBe(105);
  });

  it('reports every problem in one response', async () => {
    const res = await dispatch({ emkType: 'EMK9', quantity: -1 });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual(['emkType', 'quantity', 'subWarehouseId']);
    expect(typeof res.body.error).toBe('string');
  });

  it('rejects quantities that would overflow the database column', async () => {
    const res = await dispatch({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 5_000_000_000 });
    expect(res.status).toBe(400);
  });

  it('ignores fields the endpoint does not accept', async () => {
    const [household] = await createHouseholds(fx.a.district.id, 1);
    const res = await request(app).patch(`/api/households/${household.id}`).set(...bearer(fx.users.admin))
      .send({ notes: 'checked', districtId: fx.b.district.id, delivered: true });
    expect(res.status).toBe(200);
    const after = await prisma.household.findUniqueOrThrow({ where: { id: household.id } });
    expect(after.districtId).toBe(fx.a.district.id);
    expect(after.delivered).toBe(false);
  });

  it('returns a JSON 400 for malformed JSON', async () => {
    const res = await request(app).post('/api/stock/dispatch').set(...bearer(fx.users.admin))
      .set('Content-Type', 'application/json').send('{"quantity": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Request body is not valid JSON' });
  });

  it('accepts both delivery receipt shapes', async () => {
    const run = await prisma.deliveryRun.create({
      data: {
        subWarehouseId: fx.a.subWarehouse.id, teamNumber: 1, zone: 'A', departedAt: new Date(),
        leadVolunteerId: fx.leadVolunteer.id, performedById: fx.users.admin.id,
      },
    });
    const [h1, h2] = await createHouseholds(fx.a.district.id, 2);
    const deliveredAt = new Date().toISOString();

    const legacy = await request(app).post('/api/delivery/receipts').set(...bearer(fx.users.volunteerA))
      .send({ deliveryRunId: run.id, householdId: h1.id, emkType: 'EMK1', deliveredAt });
    expect(legacy.status).toBe(201);

    const multi = await request(app).post('/api/delivery/receipts').set(...bearer(fx.users.volunteerA))
      .send({ deliveryRunId: run.id, householdId: h2.id, kits: [{ emkType: 'EMK1', quantity: 2 }, { emkType: 'EMK2', quantity: 1 }], deliveredAt });
    expect(multi.status).toBe(201);
    expect(multi.body).toHaveLength(2);

    const neither = await request(app).post('/api/delivery/receipts').set(...bearer(fx.users.volunteerA))
      .send({ deliveryRunId: run.id, householdId: h2.id, deliveredAt });
    expect(neither.status).toBe(400);
  });
});

describe('error responses', () => {
  it('uses specific statuses for conflicts and missing records', async () => {
    const short = await dispatch({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 1000 });
    expect(short.status).toBe(422);

    const missing = await request(app).patch('/api/delivery/runs/does-not-exist/complete').set(...bearer(fx.users.admin));
    expect(missing.status).toBe(404);
  });

  it('returns JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Route not found' });
  });
});
