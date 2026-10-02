import { z } from 'zod';
import { EmkType } from '@prisma/client';

// Numbers may arrive as JSON numbers or numeric strings (Swagger, form posts).
// Anything else — including "abc" → NaN — is rejected.
const toNumber = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v);

export const int = (min: number, max: number) =>
  z.preprocess(toNumber, z.number().int().min(min).max(max));

// Upper bounds keep values inside Postgres INT4 and well above any real stock level
export const MAX_QUANTITY = 1_000_000;

export const positiveQuantity = int(1, MAX_QUANTITY);
export const signedQuantity = int(-MAX_QUANTITY, MAX_QUANTITY).refine((n) => n !== 0, 'must not be 0');

export const id = z.string().trim().min(1).max(64);
export const text = (max: number) => z.string().trim().min(1).max(max);
export const optionalText = (max: number) => z.string().trim().max(max).optional();

export const emkType = z.enum(EmkType);
