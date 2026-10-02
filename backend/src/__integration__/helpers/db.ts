import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { deleteCached } from '../../utils/cache';

// Wipe every table (except Prisma's migration history) and the in-memory cache
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
  deleteCached();
}

export const TEST_PASSWORD = 'test-password-1234';

let passwordHash: string | undefined;

// Two districts, each with a sub-warehouse + stock, a central warehouse, and
// one user per role (HUB_MANAGER/VOLUNTEER scoped to district A).
export async function seedFixture(stock: { emk1?: number; emk2?: number; emk3?: number; central?: number } = {}) {
  passwordHash ??= await bcrypt.hash(TEST_PASSWORD, 4);

  const makeDistrict = async (name: string) => {
    const district = await prisma.district.create({
      data: { name, population: 1000, latitude: 11.5, longitude: 104.9 },
    });
    const subWarehouse = await prisma.subWarehouse.create({
      data: {
        districtId: district.id, name: `${name} Hub`, address: `${name} address`,
        latitude: 11.5, longitude: 104.9, capacitySqm: 50, status: 'ACTIVE',
        stock: {
          create: {
            emk1Total: stock.emk1 ?? 100, emk1Remaining: stock.emk1 ?? 100,
            emk2Total: stock.emk2 ?? 100, emk2Remaining: stock.emk2 ?? 100,
            emk3Total: stock.emk3 ?? 100, emk3Remaining: stock.emk3 ?? 100,
          },
        },
      },
    });
    return { district, subWarehouse };
  };

  const a = await makeDistrict('District A');
  const b = await makeDistrict('District B');

  const central = await prisma.centralWarehouse.create({
    data: {
      emk1Total: stock.central ?? 100, emk1Remaining: stock.central ?? 100,
      emk2Total: stock.central ?? 100, emk2Remaining: stock.central ?? 100,
      emk3Total: stock.central ?? 100, emk3Remaining: stock.central ?? 100,
    },
  });

  const makeUser = (role: Role, email: string, districtId: string | null = null) =>
    prisma.user.create({ data: { email, name: email.split('@')[0], role, passwordHash: passwordHash!, districtId } });

  const users = {
    admin:       await makeUser('SUPER_ADMIN',           'admin@test.local'),
    coordinator: await makeUser('EMERGENCY_COORDINATOR', 'coordinator@test.local'),
    hubA:        await makeUser('HUB_MANAGER',           'hub-a@test.local', a.district.id),
    hubB:        await makeUser('HUB_MANAGER',           'hub-b@test.local', b.district.id),
    volunteerA:  await makeUser('VOLUNTEER',             'volunteer-a@test.local', a.district.id),
    viewer:      await makeUser('VIEWER',                'viewer@test.local'),
  };

  const leadVolunteer = await prisma.volunteer.create({
    data: { districtId: a.district.id, name: 'Lead A', phone: '012000000', role: 'TEAM_LEADER', userId: users.volunteerA.id },
  });

  return { a, b, central, users, leadVolunteer };
}

export type Fixture = Awaited<ReturnType<typeof seedFixture>>;

export async function createHouseholds(districtId: string, count: number) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push(await prisma.household.create({
      data: { address: `House ${i}`, districtId, totalScore: 10 },
    }));
  }
  return rows;
}
