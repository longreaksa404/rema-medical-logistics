import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── STOCK ALLOCATION (Section B.2) ──────────────────────────────────────────
// Sub-warehouse opening stock (pre-positioned at Phase 1)
// Dangkao:     8,000 households → EMK1: 6,000 | EMK2: 1,500 | EMK3: 0
// Mean Chey:   6,000 households → EMK1: 4,500 | EMK2: 1,200 | EMK3: 0
// Pou Senchey: 7,000 households → EMK1: 5,200 | EMK2: 1,400 | EMK3: 0
//
// Central 30% reserve (Section B.2):
//   Total dispatched: EMK1=15,700 | EMK2=4,100
//   Grand total = dispatched / 0.70 → Central = grand_total × 0.30
//   EMK1: round(15700 / 0.70 × 0.30) = 6,729 → 6,730
//   EMK2: round(4100  / 0.70 × 0.30) = 1,757 → 1,760
//   EMK3: starts at 0 — MoH cold storage, transferred at activation only

const CENTRAL_STOCK = { emk1: 6730, emk2: 1760, emk3: 0 };

const SUB_STOCK = [
  { districtIndex: 0, emk1: 6000, emk2: 1500, emk3: 0 }, // Dangkao
  { districtIndex: 1, emk1: 4500, emk2: 1200, emk3: 0 }, // Mean Chey
  { districtIndex: 2, emk1: 5200, emk2: 1400, emk3: 0 }, // Pou Senchey
];

async function main() {
  const hash = await bcrypt.hash('rema1234', 10);

  // ─── DISTRICTS ──────────────────────────────────────────────────────────────
  // Real coordinates from OpenStreetMap (Nominatim)
  // Dangkao:     R2259498  centre 11.5058, 104.8914
  // Mean Chey:   R2259500  centre 11.5315, 104.8985
  // Pou Senchey: R9590423  centre 11.5539, 104.8267
  const d1 = await prisma.district.upsert({
    where: { name: 'Dangkao' },
    update: { latitude: 11.5058, longitude: 104.8914, population: 8000 },
    create: { name: 'Dangkao', population: 8000, latitude: 11.5058, longitude: 104.8914 },
  });
  const d2 = await prisma.district.upsert({
    where: { name: 'Mean Chey' },
    update: { latitude: 11.5315, longitude: 104.8985, population: 6000 },
    create: { name: 'Mean Chey', population: 6000, latitude: 11.5315, longitude: 104.8985 },
  });
  const d3 = await prisma.district.upsert({
    where: { name: 'Pou Senchey' },
    update: { latitude: 11.5539, longitude: 104.8267, population: 7000 },
    create: { name: 'Pou Senchey', population: 7000, latitude: 11.5539, longitude: 104.8267 },
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
  // Located in existing community buildings — no new construction needed
  const sw1 = await prisma.subWarehouse.upsert({
    where: { districtId: d1.id },
    update: {},
    create: {
      districtId:  d1.id,
      name:        'Sub-Warehouse Dangkao',
      address:     'Dangkao District Hall, Khan Dangkao, Phnom Penh',
      latitude:    11.5058,
      longitude:   104.8914,
      capacitySqm: 50,
    },
  });
  const sw2 = await prisma.subWarehouse.upsert({
    where: { districtId: d2.id },
    update: {},
    create: {
      districtId:  d2.id,
      name:        'Sub-Warehouse Mean Chey',
      address:     'Mean Chey Community School, Khan Mean Chey, Phnom Penh',
      latitude:    11.5315,
      longitude:   104.8985,
      capacitySqm: 45,
    },
  });
  const sw3 = await prisma.subWarehouse.upsert({
    where: { districtId: d3.id },
    update: {},
    create: {
      districtId:  d3.id,
      name:        'Sub-Warehouse Pou Senchey',
      address:     'Pou Senchey Health Station, Khan Pou Senchey, Phnom Penh',
      latitude:    11.5539,
      longitude:   104.8267,
      capacitySqm: 40,
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
  // SUPER_ADMIN created via seed only — never via API (security decision)
  // All passwords: rema1234 (change on first login in production)
  const users: Array<{ email: string; name: string; role: Role; districtId: string | null }> = [
    { email: 'admin@rema.kh',       name: 'REMA Super Admin',           role: Role.SUPER_ADMIN,           districtId: null  },
    { email: 'coordinator@rema.kh', name: 'Emergency Coordinator',      role: Role.EMERGENCY_COORDINATOR, districtId: null  },
    { email: 'hub1@rema.kh',        name: 'Hub Manager Dangkao',        role: Role.HUB_MANAGER,           districtId: d1.id },
    { email: 'hub2@rema.kh',        name: 'Hub Manager Mean Chey',      role: Role.HUB_MANAGER,           districtId: d2.id },
    { email: 'hub3@rema.kh',        name: 'Hub Manager Pou Senchey',    role: Role.HUB_MANAGER,           districtId: d3.id },
    { email: 'volunteer1@rema.kh',  name: 'Volunteer Dangkao',          role: Role.VOLUNTEER,             districtId: d1.id },
    { email: 'viewer@rema.kh',      name: 'Read-Only Viewer',           role: Role.VIEWER,                districtId: null  },
  ];

  for (const u of users) {
    const created = await prisma.user.upsert({
      where:  { email: u.email },
      update: { passwordHash: hash },
      create: { email: u.email, name: u.name, role: u.role, passwordHash: hash, districtId: u.districtId },
    });
    console.log(`  ✓ ${created.role.padEnd(24)} ${created.email}`);
  }

  // ─── ROUTES (default zone depths — Phase 0 baseline) ────────────────────────
  // 3 zones per district, starting depth 0cm (dry season baseline)
  // Hub Managers update these during active flood response
  const zones = ['Zone A', 'Zone B', 'Zone C'];
  for (const district of districts) {
    for (const zone of zones) {
      const existing = await prisma.route.findFirst({
        where: { districtId: district.id, zone },
      });
      if (!existing) {
        await prisma.route.create({
          data: {
            districtId:   district.id,
            zone,
            waterDepthCm: 0,
            deliveryMode: 'MOTORBIKE',
            active:       true,
          },
        });
      }
    }
  }
  console.log('✓ Default routes seeded (3 zones × 3 districts = 9 routes)');

  // ─── VOLUNTEERS (minimum 12 per sub-warehouse = 36 total) ───────────────────
  // Section D: 36 volunteers minimum — 12 per district
  const volunteerData = [
    // Dangkao — 12 volunteers
    { districtId: d1.id, name: 'Sok Dara',      phone: '012-111-001', role: 'TEAM_LEADER' },
    { districtId: d1.id, name: 'Chan Piseth',   phone: '012-111-002', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Keo Sreymom',   phone: '012-111-003', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Heng Bunna',    phone: '012-111-004', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Ly Channary',   phone: '012-111-005', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Pich Ratana',   phone: '012-111-006', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Mao Sopheak',   phone: '012-111-007', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Noun Bopha',    phone: '012-111-008', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Ros Makara',    phone: '012-111-009', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Seng Vanna',    phone: '012-111-010', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Touch Sophon',  phone: '012-111-011', role: 'VOLUNTEER'   },
    { districtId: d1.id, name: 'Ung Kimheng',   phone: '012-111-012', role: 'VOLUNTEER'   },
    // Mean Chey — 12 volunteers
    { districtId: d2.id, name: 'Prum Sokheng',  phone: '012-222-001', role: 'TEAM_LEADER' },
    { districtId: d2.id, name: 'Lim Dara',      phone: '012-222-002', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Kong Pisey',    phone: '012-222-003', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Tep Rathana',   phone: '012-222-004', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Kem Sothea',    phone: '012-222-005', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Iv Sreypov',    phone: '012-222-006', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Nget Bunthoeun',phone: '012-222-007', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Oum Sokha',     phone: '012-222-008', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Pen Chansophea',phone: '012-222-009', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Sam Bunroeun',  phone: '012-222-010', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Suon Kolap',    phone: '012-222-011', role: 'VOLUNTEER'   },
    { districtId: d2.id, name: 'Van Sokunthea', phone: '012-222-012', role: 'VOLUNTEER'   },
    // Pou Senchey — 12 volunteers
    { districtId: d3.id, name: 'Yem Samnang',   phone: '012-333-001', role: 'TEAM_LEADER' },
    { districtId: d3.id, name: 'Chhum Ratha',   phone: '012-333-002', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Din Phally',     phone: '012-333-003', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Em Sovannara',  phone: '012-333-004', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Fon Sreyleak',  phone: '012-333-005', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Hang Kosal',    phone: '012-333-006', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'In Channtha',   phone: '012-333-007', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Jav Sokhom',    phone: '012-333-008', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Ke Bunthan',    phone: '012-333-009', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Leng Phearum',  phone: '012-333-010', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Mom Sreynich',  phone: '012-333-011', role: 'VOLUNTEER'   },
    { districtId: d3.id, name: 'Norn Komnap',   phone: '012-333-012', role: 'VOLUNTEER'   },
  ];

  for (const v of volunteerData) {
    const existing = await prisma.volunteer.findFirst({
      where: { districtId: v.districtId, phone: v.phone },
    });
    if (!existing) {
      await prisma.volunteer.create({
        data: {
          districtId: v.districtId,
          name:       v.name,
          phone:      v.phone,
          role:       v.role as any,
          status:     'AVAILABLE',
        },
      });
    }
  }
  console.log('✓ Volunteers seeded (36 total — 12 per district)');

  // ─── FLOOD ALERT (Phase 0 baseline) ─────────────────────────────────────────
  const existingAlert = await prisma.floodAlert.findFirst();
  if (!existingAlert) {
    await prisma.floodAlert.create({
      data: {
        warningLevelTwo:      false,
        rainfallExceeds100mm: false,
        streetFloodingReport: false,
        activated:            false,
        activatedAt:          null,
        phase:                0,
      },
    });
    console.log('✓ Flood alert initialised — Phase 0 standby');
  } else {
    console.log('✓ Flood alert already exists — skipping');
  }

  // ─── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n=== Seed complete — Phnom Penh deployment ===');
  console.log('All passwords: rema1234');
  console.log('\nTest accounts:');
  console.log('  admin@rema.kh         SUPER_ADMIN');
  console.log('  coordinator@rema.kh   EMERGENCY_COORDINATOR');
  console.log('  hub1@rema.kh          HUB_MANAGER  — Dangkao');
  console.log('  hub2@rema.kh          HUB_MANAGER  — Mean Chey');
  console.log('  hub3@rema.kh          HUB_MANAGER  — Pou Senchey');
  console.log('  volunteer1@rema.kh    VOLUNTEER    — Dangkao');
  console.log('  viewer@rema.kh        VIEWER');
  console.log('\nStock summary:');
  console.log('  Dangkao:     EMK1=6,000 | EMK2=1,500 | EMK3=0');
  console.log('  Mean Chey:   EMK1=4,500 | EMK2=1,200 | EMK3=0');
  console.log('  Pou Senchey: EMK1=5,200 | EMK2=1,400 | EMK3=0');
  console.log(`  Central:     EMK1=${CENTRAL_STOCK.emk1} | EMK2=${CENTRAL_STOCK.emk2} | EMK3=0 (30% reserve)`);
  console.log('\nDistricts (Phnom Penh — real OSM coordinates):');
  console.log('  Dangkao      11.5058, 104.8914  (R2259498)');
  console.log('  Mean Chey    11.5315, 104.8985  (R2259500)');
  console.log('  Pou Senchey  11.5539, 104.8267  (R9590423)');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });