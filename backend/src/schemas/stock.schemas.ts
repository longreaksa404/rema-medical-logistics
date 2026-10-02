import { z } from 'zod';
import { emkType, id, int, optionalText, positiveQuantity, signedQuantity, text } from './common';

export const dispatchBody = z.object({
  subWarehouseId: id,
  emkType,
  quantity: positiveQuantity,
  reason: optionalText(500),
});

export const reallocateBody = z.object({
  fromSubWarehouseId: id,
  toSubWarehouseId: id,
  emkType,
  quantity: positiveQuantity,
  reason: optionalText(500),
});

export const adjustBody = z.object({
  subWarehouseId: id,
  emkType,
  quantity: signedQuantity,
  reason: text(500),
});

export const replenishCentralBody = z.object({
  emkType,
  quantity: positiveQuantity,
  reason: text(500),
});

export const adjustCentralBody = z.object({
  emkType,
  quantity: signedQuantity,
  reason: text(500),
});

export const allocationBody = z.object({
  target: z.enum(['central', 'subWarehouse']),
  subWarehouseId: id.optional(),
  emkType,
  newTotal: int(0, 10_000_000),
  reason: text(500),
}).refine((b) => b.target !== 'subWarehouse' || !!b.subWarehouseId, {
  message: 'subWarehouseId is required when target is "subWarehouse"',
  path: ['subWarehouseId'],
});
