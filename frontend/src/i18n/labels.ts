import type { Translate } from './I18nContext';
import type { MessageKey } from './en';

// Labels for values that arrive from the API (district names, Prisma enums).
// Unknown values are shown as-is so a new district or enum never renders blank.

const ENUM_KEYS = {
  district: {
    'Dangkao': 'district.dangkao',
    'Mean Chey': 'district.meanChey',
    'Pou Senchey': 'district.pouSenchey',
  },
  role: {
    SUPER_ADMIN: 'role.SUPER_ADMIN',
    EMERGENCY_COORDINATOR: 'role.EMERGENCY_COORDINATOR',
    HUB_MANAGER: 'role.HUB_MANAGER',
    VOLUNTEER: 'role.VOLUNTEER',
    VIEWER: 'role.VIEWER',
  },
  band: {
    CRITICAL: 'band.CRITICAL',
    HIGH: 'band.HIGH',
    MEDIUM: 'band.MEDIUM',
    STANDARD: 'band.STANDARD',
  },
  mode: {
    MOTORBIKE: 'mode.MOTORBIKE',
    BICYCLE_OR_FOOT: 'mode.BICYCLE_OR_FOOT',
    BOAT: 'mode.BOAT',
    SUSPENDED: 'mode.SUSPENDED',
  },
  incidentType: {
    ROUTE_BLOCKED: 'incidentType.ROUTE_BLOCKED',
    VOLUNTEER_SAFETY: 'incidentType.VOLUNTEER_SAFETY',
    STOCK_SCARCITY: 'incidentType.STOCK_SCARCITY',
    BUILDING_FLOODED: 'incidentType.BUILDING_FLOODED',
    OTHER: 'incidentType.OTHER',
  },
  incidentStatus: {
    OPEN: 'incidentStatus.OPEN',
    ESCALATED: 'incidentStatus.ESCALATED',
    RESOLVED: 'incidentStatus.RESOLVED',
  },
  warehouseStatus: {
    INACTIVE: 'warehouseStatus.INACTIVE',
    ACTIVE: 'warehouseStatus.ACTIVE',
    BACKUP_ACTIVATED: 'warehouseStatus.BACKUP_ACTIVATED',
  },
  runStatus: {
    IN_PROGRESS: 'runStatus.IN_PROGRESS',
    COMPLETE: 'runStatus.COMPLETE',
    ABORTED: 'runStatus.ABORTED',
  },
  volunteerStatus: {
    AVAILABLE: 'volunteerStatus.AVAILABLE',
    DEPLOYED: 'volunteerStatus.DEPLOYED',
    INACTIVE: 'volunteerStatus.INACTIVE',
  },
  volunteerRole: {
    TEAM_LEADER: 'volunteerRole.TEAM_LEADER',
    VOLUNTEER: 'volunteerRole.VOLUNTEER',
  },
  movementType: {
    DISPATCH: 'movementType.DISPATCH',
    DELIVERY: 'movementType.DELIVERY',
    REALLOCATION: 'movementType.REALLOCATION',
    ADJUSTMENT: 'movementType.ADJUSTMENT',
    MOH_TRANSFER: 'movementType.MOH_TRANSFER',
    // central-warehouse movement types
    REPLENISH: 'movementType.REPLENISH',
    ALLOCATION_CHANGE: 'movementType.ALLOCATION_CHANGE',
  },
  radioStatus: {
    OK: 'radioStatus.OK',
    ISSUE_REPORTED: 'radioStatus.ISSUE_REPORTED',
  },
} satisfies Record<string, Record<string, MessageKey>>;

export type EnumKind = keyof typeof ENUM_KEYS;

export function enumLabel(t: Translate, kind: EnumKind, value: string | null | undefined): string {
  if (!value) return '';
  const key = (ENUM_KEYS[kind] as Record<string, MessageKey>)[value];
  return key ? t(key) : value;
}

export const districtLabel = (t: Translate, name: string | null | undefined) => enumLabel(t, 'district', name);
export const roleLabel     = (t: Translate, role: string | null | undefined) => enumLabel(t, 'role', role);
export const bandLabel     = (t: Translate, band: string | null | undefined) => enumLabel(t, 'band', band);
export const modeLabel     = (t: Translate, mode: string | null | undefined) => enumLabel(t, 'mode', mode);

// Zones arrive as 'Zone A' or 'A'; only the word "Zone" is translated.
export function zoneLabel(t: Translate, zone: string | null | undefined): string {
  if (!zone) return '';
  return t('routing.zone', { z: zone.replace(/^Zone\s*/i, '') });
}
