import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'rema1234';
  const hash = await bcrypt.hash(password, 10);

  const d1 = await prisma.district.upsert({
    where: { name: 'District 1' },
    update: {},
    create: { name: 'District 1', population: 8000, latitude: 10.762, longitude: 106.660 },
  });

  const d2 = await prisma.district.upsert({
    where: { name: 'District 2' },
    update: {},
    create: { name: 'District 2', population: 6000, latitude: 10.770, longitude: 106.670 },
  });

  const d3 = await prisma.district.upsert({
    where: { name: 'District 3' },
    update: {},
    create: { name: 'District 3', population: 7000, latitude: 10.755, longitude: 106.650 },
  });

  console.log('Districts seeded:', d1.name, d2.name, d3.name);

  await prisma.subWarehouse.upsert({
    where: { districtId: d1.id },
    update: {},
    create: {
      districtId: d1.id,
      name: 'Sub-Warehouse 1',
      address: 'Ward Office, District 1',
      latitude: 10.762,
      longitude: 106.660,
      capacitySqm: 50,
    },
  });

  await prisma.subWarehouse.upsert({
    where: { districtId: d2.id },
    update: {},
    create: {
      districtId: d2.id,
      name: 'Sub-Warehouse 2',
      address: 'Community School, District 2',
      latitude: 10.770,
      longitude: 106.670,
      capacitySqm: 45,
    },
  });

  await prisma.subWarehouse.upsert({
    where: { districtId: d3.id },
    update: {},
    create: {
      districtId: d3.id,
      name: 'Sub-Warehouse 3',
      address: 'Health Station, District 3',
      latitude: 10.755,
      longitude: 106.650,
      capacitySqm: 40,
    },
  });

  console.log('Sub-warehouses seeded');

  const users: Array<{
    email: string;
    name: string;
    role: Role;
    districtId: string | null;
  }> = [
    { email: 'admin@rema.vn',       name: 'REMA Super Admin',           role: Role.SUPER_ADMIN,           districtId: null   },
    { email: 'coordinator@rema.vn', name: 'Emergency Coordinator',      role: Role.EMERGENCY_COORDINATOR, districtId: null   },
    { email: 'hub1@rema.vn',        name: 'Hub Manager District 1',     role: Role.HUB_MANAGER,           districtId: d1.id  },
    { email: 'volunteer1@rema.vn',  name: 'Volunteer District 1',       role: Role.VOLUNTEER,             districtId: d1.id  },
    { email: 'viewer@rema.vn',      name: 'Read-Only Viewer',           role: Role.VIEWER,                districtId: null   },
  ];

  for (const u of users) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash },
      create: { email: u.email, name: u.name, role: u.role, passwordHash: hash, districtId: u.districtId },
    });
    console.log(`  ✓ ${created.role.padEnd(24)} ${created.email}`);
  }

  console.log('\nSeed complete. All passwords: rema1234');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });