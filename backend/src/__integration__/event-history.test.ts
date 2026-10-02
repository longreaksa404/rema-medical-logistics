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

const trigger = (condition: string) =>
  request(app).post('/api/alert/trigger').set(...bearer(fx.users.coordinator)).send({ condition });
const advance = (phase: number) =>
  request(app).patch('/api/alert/phase').set(...bearer(fx.users.coordinator)).send({ phase });
const closeEvent = () => request(app).post('/api/alert/reset').set(...bearer(fx.users.admin));
const history = () => request(app).get('/api/alert/history').set(...bearer(fx.users.viewer));

async function activate() {
  await trigger('warningLevelTwo');
  await trigger('rainfallExceeds100mm');
}

describe('flood event lifecycle', () => {
  it('archives the event on close and keeps its after-action stats', async () => {
    await activate();
    expect((await advance(2)).body.phase2At).toBeTruthy();
    const event = await prisma.floodAlert.findFirstOrThrow();

    // activity during the event
    const [h1, h2] = await createHouseholds(fx.a.district.id, 2);
    const done = await prisma.deliveryRun.create({
      data: { subWarehouseId: fx.a.subWarehouse.id, teamNumber: 1, zone: 'A', departedAt: new Date(), status: 'COMPLETE',
        leadVolunteerId: fx.leadVolunteer.id, performedById: fx.users.hubA.id },
    });
    await prisma.deliveryReceipt.createMany({ data: [
      { deliveryRunId: done.id, householdId: h1.id, emkType: 'EMK1', quantity: 2, deliveredAt: new Date() },
      { deliveryRunId: done.id, householdId: h1.id, emkType: 'EMK2', quantity: 1, deliveredAt: new Date() },
      { deliveryRunId: done.id, householdId: h2.id, emkType: 'EMK1', quantity: 1, deliveredAt: new Date() },
    ] });
    await prisma.incident.create({ data: { districtId: fx.a.district.id, type: 'ROUTE_BLOCKED', description: 'x', reportedById: fx.users.hubA.id } });
    await prisma.volunteerAssignment.create({
      data: { volunteerId: fx.leadVolunteer.id, subWarehouseId: fx.a.subWarehouse.id, alertId: event.id, zone: 'A', teamNumber: 2 },
    });
    // a team still out when the event is closed
    await prisma.volunteer.update({ where: { id: fx.leadVolunteer.id }, data: { status: 'DEPLOYED' } });
    const stillOut = await prisma.deliveryRun.create({
      data: { subWarehouseId: fx.a.subWarehouse.id, teamNumber: 2, zone: 'B', departedAt: new Date(),
        leadVolunteerId: fx.leadVolunteer.id, performedById: fx.users.hubA.id },
    });

    const closed = await closeEvent();
    expect(closed.status).toBe(200);
    expect(closed.body).toMatchObject({ archivedEventId: event.id, runsAborted: 1, volunteersStoodDown: 1 });
    expect(closed.body.alert).toMatchObject({ phase: 0, activated: false });

    expect(await prisma.deliveryRun.findUniqueOrThrow({ where: { id: stillOut.id } }))
      .toMatchObject({ status: 'ABORTED', abortReason: 'Flood event closed' });
    expect((await prisma.volunteer.findUniqueOrThrow({ where: { id: fx.leadVolunteer.id } })).status).toBe('AVAILABLE');

    // the new standby event is what status reports
    const status = await request(app).get('/api/alert/status').set(...bearer(fx.users.viewer));
    expect(status.body).toMatchObject({ phase: 0, activated: false, warningLevelTwo: false });
    expect(status.body.id).not.toBe(event.id);

    const res = await history();
    expect(res.status).toBe(200);
    expect(res.body.map((e: { status: string }) => e.status)).toEqual(['OPEN', 'CLOSED']);
    expect(res.body[1]).toMatchObject({
      id: event.id,
      activated: true,
      phaseReached: 2,
      closedBy: { name: 'admin' },
      conditions: { warningLevelTwo: true, rainfallExceeds100mm: true, streetFloodingReport: false },
      stats: {
        householdsAssessed: 2,
        householdsDelivered: 2,
        kitsDelivered: { EMK1: 3, EMK2: 1, EMK3: 0 },
        deliveryRuns: { total: 2, complete: 1, aborted: 1, inProgress: 0 },
        incidents: { total: 1, unresolved: 1, byType: { ROUTE_BLOCKED: 1 } },
        volunteersDeployed: 1,
      },
    });
    expect(res.body[1].conditionReports).toHaveLength(2);
  });

  it('counts activity after closing towards the new event only', async () => {
    await activate();
    await closeEvent();
    await prisma.incident.create({ data: { districtId: fx.a.district.id, type: 'OTHER', description: 'after', reportedById: fx.users.hubA.id } });

    const res = await history();
    expect(res.body[0].stats.incidents.total).toBe(1);   // open event
    expect(res.body[1].stats.incidents.total).toBe(0);   // archived event
  });

  it('has nothing to archive when REMA is already on standby', async () => {
    const res = await closeEvent();
    expect(res.status).toBe(200);
    expect(res.body.archivedEventId).toBeNull();
    expect((await history()).body).toHaveLength(1);
  });

  it('archives an event only once when two admins close it together', async () => {
    await activate();
    await Promise.all([closeEvent(), closeEvent()]);
    expect(await prisma.floodAlert.count({ where: { closedAt: { not: null } } })).toBe(1);
    expect(await prisma.floodAlert.count({ where: { closedAt: null } })).toBe(1);
  });

  it('advances a phase only once when two coordinators press advance together', async () => {
    await activate();
    const results = await Promise.all([advance(2), advance(2), advance(2)]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await prisma.notification.count({ where: { type: 'PHASE_CHANGE' } })).toBe(4); // one per recipient, once
  });
});
