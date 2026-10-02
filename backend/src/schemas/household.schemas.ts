import { z } from 'zod';
import { id, int, optionalText, text } from './common';

// Exact allowed values per category are enforced by utils/scoring.ts
const category = int(0, 20);

const scoreFields = {
  cat1: category,
  cat2: category,
  cat3: category,
  cat4: category,
  cat5: category,
  householdSize: int(1, 100).optional(),
  hasVulnerableMember: z.boolean().optional(),
};

export const scoreBody = z.object(scoreFields);

export const createHouseholdBody = z.object({
  ...scoreFields,
  address: text(300),
  districtId: id,
  chronicIllCount: int(0, 100).optional(),
  notes: optionalText(1000),
});

export const updateHouseholdBody = z.object({
  cat1: category.optional(),
  cat2: category.optional(),
  cat3: category.optional(),
  cat4: category.optional(),
  cat5: category.optional(),
  householdSize: int(1, 100).optional(),
  hasVulnerableMember: z.boolean().optional(),
  notes: optionalText(1000),
});
