import request from 'supertest';
import app, { io } from '../app';
import { prisma } from '../lib/prisma';
import { resetDb, seedFixture, Fixture } from './helpers/db';
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

const newRun = () => prisma.deliveryRun.create({
  data: {
    subWarehouseId: fx.a.subWarehouse.id, teamNumber: 1, zone: 'A', departedAt: new Date(),
    leadVolunteerId: fx.leadVolunteer.id, performedById: fx.users.hubA.id,
  },
});

describe('delivery run abort reason', () => {
  it('is saved and returned in run history', async () => {
    const run = await newRun();
    const res = await request(app).patch(`/api/delivery/runs/${run.id}/abort`)
      .set(...bearer(fx.users.hubA)).send({ reason: 'Water above 80cm on Street 271' });
    expect(res.status).toBe(200);
    expect(res.body.abortReason).toBe('Water above 80cm on Street 271');

    const list = await request(app).get('/api/delivery/runs').set(...bearer(fx.users.viewer))
      .query({ districtId: fx.a.district.id });
    expect(list.body.history.data[0]).toMatchObject({ status: 'ABORTED', abortReason: 'Water above 80cm on Street 271' });
  });

  it('is not set when a run completes', async () => {
    const run = await newRun();
    const res = await request(app).patch(`/api/delivery/runs/${run.id}/complete`).set(...bearer(fx.users.hubA));
    expect(res.status).toBe(200);
    expect(res.body.abortReason).toBeNull();
  });

  it('is required', async () => {
    const run = await newRun();
    const res = await request(app).patch(`/api/delivery/runs/${run.id}/abort`).set(...bearer(fx.users.hubA)).send({ reason: '   ' });
    expect(res.status).toBe(400);
  });
});
