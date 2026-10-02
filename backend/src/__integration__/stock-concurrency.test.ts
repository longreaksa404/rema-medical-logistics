import { prisma } from '../lib/prisma';
import { createDeliveryReceipt, startDeliveryRun, completeDeliveryRun, abortDeliveryRun } from '../services/delivery.service';
import { dispatchStock, reallocateStock, adjustStock } from '../services/stock.service';
import { resetDb, seedFixture, createHouseholds, Fixture } from './helpers/db';

// These tests fire many requests at the same time and check that stock totals
// and delivery state stay consistent — the bugs they guard against only show up
// under concurrency.

let fx: Fixture;

beforeEach(async () => {
  await resetDb();
  fx = await seedFixture({ emk1: 10, central: 10 });
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function startRun() {
  return startDeliveryRun({
    subWarehouseId: fx.a.subWarehouse.id,
    teamNumber: 1,
    zone: 'A',
    leadVolunteerId: fx.leadVolunteer.id,
    performedById: fx.users.hubA.id,
  });
}

const stockA = () => prisma.stock.findUniqueOrThrow({ where: { subWarehouseId: fx.a.subWarehouse.id } });

describe('delivery receipts under concurrency', () => {
  it('never delivers more kits than are in stock', async () => {
    const run = await startRun();
    const households = await createHouseholds(fx.a.district.id, 25);

    const results = await Promise.allSettled(households.map((h) =>
      createDeliveryReceipt({
        deliveryRunId: run.id,
        householdId: h.id,
        kits: [{ emkType: 'EMK1', quantity: 1 }],
        deliveredAt: new Date(),
        performedById: fx.users.hubA.id,
      })
    ));

    const ok = results.filter((r) => r.status === 'fulfilled').length;
    expect(ok).toBe(10);
    expect((await stockA()).emk1Remaining).toBe(0);
    expect(await prisma.household.count({ where: { delivered: true } })).toBe(10);
    expect(await prisma.deliveryReceipt.count()).toBe(10);
    expect(await prisma.stockMovement.count({ where: { movementType: 'DELIVERY' } })).toBe(10);
  });

  it('delivers to the same household only once', async () => {
    const run = await startRun();
    const [household] = await createHouseholds(fx.a.district.id, 1);

    const results = await Promise.allSettled(Array.from({ length: 6 }, () =>
      createDeliveryReceipt({
        deliveryRunId: run.id,
        householdId: household.id,
        kits: [{ emkType: 'EMK1', quantity: 2 }],
        deliveredAt: new Date(),
        performedById: fx.users.hubA.id,
      })
    ));

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await stockA()).emk1Remaining).toBe(8);
    expect(await prisma.deliveryReceipt.count()).toBe(1);
  });

  it('rolls back every kit when one kit type is short', async () => {
    const run = await startRun();
    const [household] = await createHouseholds(fx.a.district.id, 1);
    await prisma.stock.update({ where: { subWarehouseId: fx.a.subWarehouse.id }, data: { emk2Remaining: 0 } });

    await expect(createDeliveryReceipt({
      deliveryRunId: run.id,
      householdId: household.id,
      kits: [{ emkType: 'EMK1', quantity: 3 }, { emkType: 'EMK2', quantity: 1 }],
      deliveredAt: new Date(),
      performedById: fx.users.hubA.id,
    })).rejects.toThrow(/Insufficient EMK2/);

    expect((await stockA()).emk1Remaining).toBe(10);
    expect((await prisma.household.findUniqueOrThrow({ where: { id: household.id } })).delivered).toBe(false);
    expect(await prisma.deliveryReceipt.count()).toBe(0);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it('lets a run be closed only once when complete and abort race', async () => {
    const run = await startRun();

    const results = await Promise.allSettled([
      completeDeliveryRun(run.id, fx.users.hubA.id),
      abortDeliveryRun(run.id, 'water too deep'),
      completeDeliveryRun(run.id, fx.users.hubA.id),
      abortDeliveryRun(run.id, 'water too deep'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});

describe('stock movements under concurrency', () => {
  it('never dispatches more than the central warehouse holds', async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () =>
      dispatchStock({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 3, performedById: fx.users.admin.id })
    ));

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    const central = await prisma.centralWarehouse.findUniqueOrThrow({ where: { id: fx.central.id } });
    expect(central.emk1Remaining).toBe(1);
    expect((await stockA()).emk1Remaining).toBe(19);
  });

  it('conserves stock across opposite reallocations without deadlocking', async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => {
      const [from, to] = i % 2 === 0 ? [fx.a, fx.b] : [fx.b, fx.a];
      return reallocateStock({
        fromSubWarehouseId: from.subWarehouse.id,
        toSubWarehouseId: to.subWarehouse.id,
        emkType: 'EMK1',
        quantity: 2,
        performedById: fx.users.coordinator.id,
      });
    });
    const results = await Promise.allSettled(tasks);

    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    for (const f of failures) expect(String(f.reason)).not.toMatch(/deadlock/i);

    const all = await prisma.stock.findMany();
    expect(all.reduce((sum, s) => sum + s.emk1Remaining, 0)).toBe(20);
    expect(all.every((s) => s.emk1Remaining >= 0)).toBe(true);
  });

  it('applies every concurrent adjustment (no lost updates)', async () => {
    await Promise.all(Array.from({ length: 10 }, () =>
      adjustStock({ subWarehouseId: fx.a.subWarehouse.id, emkType: 'EMK1', quantity: 1, reason: 'count', performedById: fx.users.hubA.id })
    ));
    expect((await stockA()).emk1Remaining).toBe(20);
  });
});
