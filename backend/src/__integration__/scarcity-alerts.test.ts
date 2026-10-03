import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import { httpServer, io } from '../app';
import { prisma } from '../lib/prisma';
import { createDeliveryReceipt } from '../services/delivery.service';
import { dispatchStock, adjustStock } from '../services/stock.service';
import { resetDb, seedFixture, createHouseholds, Fixture } from './helpers/db';
import { tokenFor } from './helpers/auth';

let fx: Fixture;
let socket: Socket;
let received: Array<Record<string, unknown>>;

beforeAll((done) => {
  httpServer.listen(0, done);
});

beforeEach(async () => {
  await resetDb();
  fx = await seedFixture({ emk1: 10, central: 10 });
  received = [];
  const url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
  socket = ioClient(url, { auth: { token: tokenFor(fx.users.viewer) }, transports: ['websocket'], reconnection: false });
  socket.on('scarcity_triggered', (payload) => received.push(payload));
  await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
});

afterEach(() => {
  socket.close();
});

afterAll(async () => {
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
  await prisma.$disconnect();
});

const waitForEvents = () => new Promise((resolve) => setTimeout(resolve, 200));

async function deliver(count: number, kitsEach = 1) {
  const run = await prisma.deliveryRun.create({
    data: {
      subWarehouseId: fx.a.subWarehouse.id, teamNumber: 1, zone: 'A', departedAt: new Date(),
      leadVolunteerId: fx.leadVolunteer.id, performedById: fx.users.hubA.id,
    },
  });
  const households = await createHouseholds(fx.a.district.id, count);
  for (const h of households) {
    await createDeliveryReceipt({
      deliveryRunId: run.id, householdId: h.id, kits: [{ emkType: 'EMK1', quantity: kitsEach }],
      deliveredAt: new Date(), performedById: fx.users.hubA.id,
    });
  }
}

const scarcityNotifications = () => prisma.notification.findMany({ where: { type: 'SCARCITY' }, select: { userId: true, message: true } });

describe('live scarcity alerts', () => {
  it('fires once when a delivery takes a district below 30%', async () => {
    await deliver(7);                       // 3 of 10 left = 30% → not scarce yet
    await waitForEvents();
    expect(received).toHaveLength(0);

    await deliver(1);                       // 2 of 10 = 20% → scarce
    await deliver(1);                       // still scarce → no second alert
    await waitForEvents();

    expect(received).toEqual([expect.objectContaining({
      scope: 'subWarehouse', districtId: fx.a.district.id, districtName: 'District A',
      emkType: 'EMK1', remaining: 2, total: 10, pct: 20,
    })]);
  });

  it('notifies coordinators, admins and that district\'s hub manager only', async () => {
    await adjustStock({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: -9, reason: 'count', performedById: fx.users.hubA.id });

    const recipients = (await scarcityNotifications()).map((n) => n.userId).sort();
    expect(recipients).toEqual([fx.users.admin.id, fx.users.coordinator.id, fx.users.hubA.id].sort());
    expect((await scarcityNotifications())[0].message).toMatch(/District A sub-warehouse EMK1 is at 10%/);
  });

  it('alerts on the central warehouse when dispatches drain it', async () => {
    await dispatchStock({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 8, performedById: fx.users.admin.id });
    await waitForEvents();

    expect(received).toEqual([expect.objectContaining({ scope: 'central', districtId: null, emkType: 'EMK1', pct: 20 })]);
    const recipients = (await scarcityNotifications()).map((n) => n.userId).sort();
    expect(recipients).toEqual([fx.users.admin.id, fx.users.coordinator.id].sort());
  });
});
