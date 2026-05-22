import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

// role-appropriate activity counts for the profile page
// keeps queries minimal — no joins, just counts

export async function getMyActivity(userId: string, role: Role, districtId: string | null) {

  // everyone gets these
  const incidentsReported = await prisma.incident.count({
    where: { reportedById: userId },
  });

  const radioCheckins = await prisma.radioCheckin.count({
    where: { submittedById: userId },
  });

  // volunteer-specific
  let householdsAssessed = 0;
  let deliveriesLed      = 0;

  if (role === Role.VOLUNTEER) {
    // find the linked volunteer record
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (volunteer) {
      householdsAssessed = await prisma.householdAssessment.count({
        where: { submittedById: userId },
      });

      deliveriesLed = await prisma.deliveryRun.count({
        where: { leadVolunteerId: volunteer.id },
      });
    }
  }

  // hub manager — district-level counts
  let districtDeliveries  = 0;
  let districtHouseholds  = 0;
  let districtIncidents   = 0;

  if (role === Role.HUB_MANAGER && districtId) {
    districtDeliveries = await prisma.deliveryRun.count({
      where: {
        subWarehouse: { districtId },
        status: 'COMPLETE',
      },
    });

    districtHouseholds = await prisma.household.count({
      where: { districtId, delivered: true },
    });

    districtIncidents = await prisma.incident.count({
      where: { districtId, status: { not: 'RESOLVED' } },
    });
  }

  // EC / SUPER_ADMIN — system-wide counts
  let systemDeliveries = 0;
  let systemHouseholds = 0;

  if (role === Role.EMERGENCY_COORDINATOR || role === Role.SUPER_ADMIN) {
    systemDeliveries = await prisma.deliveryRun.count({
      where: { status: 'COMPLETE' },
    });

    systemHouseholds = await prisma.household.count({
      where: { delivered: true },
    });
  }

  return {
    role,
    personal: {
      incidentsReported,
      radioCheckins,
      // volunteer only
      ...(role === Role.VOLUNTEER && { householdsAssessed, deliveriesLed }),
    },
    // hub manager only
    ...(role === Role.HUB_MANAGER && districtId && {
      district: {
        completedDeliveries: districtDeliveries,
        householdsServed:    districtHouseholds,
        openIncidents:       districtIncidents,
      },
    }),
    // EC + SUPER_ADMIN only
    ...((role === Role.EMERGENCY_COORDINATOR || role === Role.SUPER_ADMIN) && {
      system: {
        completedDeliveries: systemDeliveries,
        householdsServed:    systemHouseholds,
      },
    }),
  };
}