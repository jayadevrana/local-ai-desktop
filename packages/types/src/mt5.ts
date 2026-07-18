import { z } from 'zod';

import { mt5AccountStatuses } from './enums';
import { riskProfileSchema } from './risk';

export const mt5AccountStatusSchema = z.enum(mt5AccountStatuses);

export const symbolMappingSchema = z.object({
  id: z.string().uuid().optional(),
  externalSymbol: z.string().min(1),
  brokerSymbol: z.string().min(1),
  comment: z.string().max(255).optional(),
});

export const createMt5AccountSchema = z.object({
  nickname: z.string().min(2).max(120),
  brokerName: z.string().min(2).max(120),
  serverName: z.string().min(2).max(120),
  login: z.string().min(3).max(40),
  password: z.string().min(4).max(120),
  accountCurrency: z.string().length(3).optional(),
  symbolMappings: z.array(symbolMappingSchema).default([]),
  magicNumberBase: z.number().int().positive().optional(),
  defaultRiskProfile: riskProfileSchema.optional(),
});

export const updateMt5AccountSchema = createMt5AccountSchema.partial().extend({
  status: mt5AccountStatusSchema.optional(),
});

export const rotateWebhookSecretSchema = z.object({
  rotateToken: z.boolean().default(false),
  sourceLabel: z.string().min(2).max(100).optional(),
});

export type CreateMt5AccountInput = z.infer<typeof createMt5AccountSchema>;
