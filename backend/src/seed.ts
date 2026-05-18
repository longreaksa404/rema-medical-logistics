import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── STOCK ALLOCATION (Section B.2) ──────────────────────────────────────────
// Sub-warehouse opening stock (pre-positioned at Phase 1)
// District 1: 8,000 households → EMK1: 6,000 | EMK2: 1,500 | EMK3: 0
// District 2: 6,000 households → EMK1: 4,500 | EMK2: 1,200 | EMK3: 0
// District 3: 7,000 households → EMK1: 5,200 | EMK2: 1,400 | EMK3: 0
//
// Central 30% reserve (Section B.2):
//   Total dispatched: EMK1=15,700 | EMK2=4,100
//   Grand total = dispatched / 0.70 → Central = grand_total × 0.30
//   EMK1: round(15700 / 0.70 × 0.30) = 6,729 → 6,730
//   EMK2: round(4100  / 0.70 × 0.30) = 1,757 → 1,760
//   EMK3: starts at 0 — MoH cold storage, transferred at activation only

const CENTRAL_STOCK = { emk1: 6730, emk2: 1760, emk3: 0 };

const SUB_STOCK = [
  { districtIndex: 0, emk1: 6000, emk2: 1500, emk3: 0 },
  { districtIndex: 1, emk1: 4500, emk2: 1200, emk3: 0 },
  { districtIndex: 2, emk1: 5200, emk2: 1400, emk3: 0 },
];

async function main() {
  const hash = await bcrypt.hash('rema1234', 10);

  // ─── DISTRICTS ──────────────────────────────────────────────────────────────
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
  const districts = [d1, d2, d3];
  console.log('✓ Districts seeded:', d1.name, d2.name, d3.name);

  // ─── CENTRAL WAREHOUSE ──────────────────────────────────────────────────────
  // Uses its own central_warehouse table — no district FK.
  // Never leaks into district lists. No filter hacks needed anywhere.
  const existingCentral = await prisma.centralWarehouse.findFirst();
  if (!existingCentral) {
    await prisma.centralWarehouse.create({
      data: {
        emk1Total:     CENTRAL_STOCK.emk1,
        emk1Remaining: CENTRAL_STOCK.emk1,
        emk2Total:     CENTRAL_STOCK.emk2,
        emk2Remaining: CENTRAL_STOCK.emk2,
        emk3Total:     CENTRAL_STOCK.emk3,
        emk3Remaining: CENTRAL_STOCK.emk3,
      },
    });
    console.log(`✓ Central warehouse: EMK1=${CENTRAL_STOCK.emk1} | EMK2=${CENTRAL_STOCK.emk2} | EMK3=0 (MoH-held)`);
  } else {
    console.log('✓ Central warehouse already exists — skipping');
  }

  // ─── SUB-WAREHOUSES ─────────────────────────────────────────────────────────
  const sw1 = await prisma.subWarehouse.upsert({
    where: { districtId: d1.id },
    update: {},
    create: {
      districtId: d1.id, name: 'Sub-Warehouse 1',
      address: 'Ward Office, District 1',
      latitude: 10.762, longitude: 106.660, capacitySqm: 50,
    },
  });
  const sw2 = await prisma.subWarehouse.upsert({
    where: { districtId: d2.id },
    update: {},
    create: {
      districtId: d2.id, name: 'Sub-Warehouse 2',
      address: 'Community School, District 2',
      latitude: 10.770, longitude: 106.670, capacitySqm: 45,
    },
  });
  const sw3 = await prisma.subWarehouse.upsert({
    where: { districtId: d3.id },
    update: {},
    create: {
      districtId: d3.id, name: 'Sub-Warehouse 3',
      address: 'Health Station, District 3',
      latitude: 10.755, longitude: 106.650, capacitySqm: 40,
    },
  });
  const subWarehouses = [sw1, sw2, sw3];
  console.log('✓ Sub-warehouses seeded');

  // ─── SUB-WAREHOUSE STOCK ────────────────────────────────────────────────────
  for (let i = 0; i < subWarehouses.length; i++) {
    const sw    = subWarehouses[i];
    const alloc = SUB_STOCK[i];
    const existing = await prisma.stock.findUnique({ where: { subWarehouseId: sw.id } });
    if (existing) {
      console.log(`  ✓ Stock exists for ${sw.name} — skipping`);
    } else {
      await prisma.stock.create({
        data: {
          subWarehouseId: sw.id,
          emk1Total: alloc.emk1, emk1Remaining: alloc.emk1,
          emk2Total: alloc.emk2, emk2Remaining: alloc.emk2,
          emk3Total: alloc.emk3, emk3Remaining: alloc.emk3,
        },
      });
      console.log(`  ✓ ${sw.name}: EMK1=${alloc.emk1} | EMK2=${alloc.emk2} | EMK3=0`);
    }
  }

  // ─── USERS ──────────────────────────────────────────────────────────────────
  const users: Array<{ email: string; name: string; role: Role; districtId: string | null }> = [
    { email: 'admin@rema.vn',       name: 'REMA Super Admin',        role: Role.SUPER_ADMIN,           districtId: null  },
    { email: 'coordinator@rema.vn', name: 'Emergency Coordinator',   role: Role.EMERGENCY_COORDINATOR, districtId: null  },
    { email: 'hub1@rema.vn',        name: 'Hub Manager District 1',  role: Role.HUB_MANAGER,           districtId: d1.id },
    { email: 'hub2@rema.vn',        name: 'Hub Manager District 2',  role: Role.HUB_MANAGER,           districtId: d2.id },
    { email: 'hub3@rema.vn',        name: 'Hub Manager District 3',  role: Role.HUB_MANAGER,           districtId: d3.id },
    { email: 'volunteer1@rema.vn',  name: 'Volunteer District 1',    role: Role.VOLUNTEER,             districtId: d1.id },
    { email: 'viewer@rema.vn',      name: 'Read-Only Viewer',        role: Role.VIEWER,                districtId: null  },
  ];

  for (const u of users) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash },
      create: { email: u.email, name: u.name, role: u.role, passwordHash: hash, districtId: u.districtId },
    });
    console.log(`  ✓ ${created.role.padEnd(24)} ${created.email}`);
  }

  console.log('\n=== Seed complete ===');
  console.log('All passwords: rema1234');
  console.log('\nStock summary:');
  for (let i = 0; i < districts.length; i++) {
    const alloc = SUB_STOCK[i];
    console.log(`  ${districts[i].name}: EMK1=${alloc.emk1} | EMK2=${alloc.emk2} | EMK3=0`);
  }
  console.log(`  Central: EMK1=${CENTRAL_STOCK.emk1} | EMK2=${CENTRAL_STOCK.emk2} | EMK3=0 (30% reserve)`);
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });