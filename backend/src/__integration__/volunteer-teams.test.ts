import request from 'supertest';
import app, { io } from '../app';
import { prisma } from '../lib/prisma';
import { resetDb, seedFixture, Fixture } from './helpers/db';
import { bearer } from './helpers/auth';

let fx: Fixture;
let alertId: string;

beforeEach(async () => {
  await resetDb();
  fx = await seedFixture();
  alertId = (await prisma.floodAlert.create({ data: { activated: true, phase: 1 } })).id;
});

afterAll(async () => {
  io.close();
  await prisma.$disconnect();
});

async function deployTeam1(which: 'a' | 'b', user: typeof fx.users.hubA) {
  const leader = await prisma.volunteer.create({
    data: { districtId: fx[which].district.id, name: `Leader ${which}`, phone: '1', role: 'TEAM_LEADER' },
  });
  return request(app).post('/api/volunteers/assign-team').set(...bearer(user)).send({
    subWarehouseId: fx[which].subWarehouse.id, alertId, zone: 'A', teamNumber: 1, leaderId: leader.id,
  });
}

describe('team numbers are per district', () => {
  it('lets every district deploy its own Team 1', async () => {
    expect((await deployTeam1('a', fx.users.hubA)).status).toBe(201);
    expect((await deployTeam1('b', fx.users.hubB)).status).toBe(201);
  });

  it('deleting Team 1 in one district leaves other districts\' Team 1 alone', async () => {
    await deployTeam1('a', fx.users.hubA);
    await deployTeam1('b', fx.users.hubB);

    const res = await request(app).delete('/api/volunteers/team').set(...bearer(fx.users.hubA))
      .send({ districtId: fx.a.district.id, alertId, teamNumber: 1 });
    expect(res.status).toBe(200);

    const remaining = await prisma.volunteerAssignment.findMany({ select: { subWarehouseId: true } });
    expect(remaining).toEqual([{ subWarehouseId: fx.b.subWarehouse.id }]);
  });
});
