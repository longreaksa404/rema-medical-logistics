import { z } from 'zod';
import { Role } from '@prisma/client';
import { id, text } from './common';

// bcrypt only uses the first 72 bytes of a password — cap new passwords there
const newPassword = z.string().min(8, 'must be at least 8 characters').max(72);
const email = z.string().trim().pipe(z.email()).pipe(z.string().max(254));
const phone = z.string().trim().max(30);

export const loginBody = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

export const createUserBody = z.object({
  email,
  name: text(120),
  role: z.enum(Role),
  districtId: id.optional().nullable(),
  temporaryPassword: newPassword,
  phone: phone.optional(),
});

export const updateUserBody = z.object({
  name: text(120).optional(),
  email: email.optional(),
  role: z.enum(Role).optional(),
  districtId: id.nullable().optional(),
  phone: phone.nullable().optional(),
  active: z.boolean().optional(),
});

export const updateProfileBody = z.object({
  name: text(120).optional(),
  phone: phone.nullable().optional(),
}).refine((b) => b.name !== undefined || b.phone !== undefined, {
  message: 'Provide at least one field to update: name or phone',
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword,
});

export const resetPasswordBody = z.object({
  temporaryPassword: newPassword,
});

export const avatarBody = z.object({
  avatarBase64: z.string().min(1),
});
