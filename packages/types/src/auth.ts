import { z } from 'zod';

import { organizationRoles } from './enums';

export const organizationRoleSchema = z.enum(organizationRoles);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  fullName: z.string().min(2).max(120),
  organizationName: z.string().min(2).max(140),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128).optional(),
  magicToken: z.string().min(32).optional(),
  totpCode: z.string().length(6).optional(),
});

export const requestMagicLinkSchema = z.object({
  email: z.string().email(),
  redirectUrl: z.string().url().optional(),
});

export const totpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: organizationRoleSchema,
});

export const sessionResponseSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: organizationRoleSchema,
  requiresTotp: z.boolean(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
