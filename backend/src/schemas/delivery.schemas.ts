import { z } from 'zod';
import { emkType, id, int, optionalText, positiveQuantity, text } from './common';

export const startRunBody = z.object({
  subWarehouseId: id,
  teamNumber: int(1, 1000),
  zone: text(50),
  leadVolunteerId: id,
});

// Accepts either the multi-kit shape { kits: [...] } or the legacy single-kit
// shape { emkType, quantity? }, and normalises both to { kits }.
export const receiptBody = z.object({
  deliveryRunId: id,
  householdId: id,
  deliveredAt: z.coerce.date(),
  notes: optionalText(1000),
  kits: z.array(z.object({ emkType, quantity: positiveQuantity })).min(1).max(10).optional(),
  emkType: emkType.optional(),
  quantity: positiveQuantity.optional(),
}).transform((b, ctx) => {
  const kits = b.kits ?? (b.emkType ? [{ emkType: b.emkType, quantity: b.quantity ?? 1 }] : undefined);
  if (!kits) {
    ctx.addIssue({ code: 'custom', message: 'Either emkType or kits array is required', path: ['kits'] });
    return z.NEVER;
  }
  return { deliveryRunId: b.deliveryRunId, householdId: b.householdId, deliveredAt: b.deliveredAt, notes: b.notes, kits };
});

export const abortRunBody = z.object({
  reason: text(500),
});
