import { z } from 'zod';

import { orderSides, orderTypes, signalActions, volumeModes } from './enums';

export const signalActionSchema = z.enum(signalActions);
export const orderSideSchema = z.enum(orderSides);
export const orderTypeSchema = z.enum(orderTypes);
export const volumeModeSchema = z.enum(volumeModes);

export const trailingSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  triggerPips: z.number().positive().optional(),
  distancePips: z.number().positive().optional(),
}).optional();

export const breakevenSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  triggerPips: z.number().positive().optional(),
  offsetPips: z.number().nonnegative().optional(),
}).optional();

export const canonicalSignalSchema = z.object({
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid(),
  mt5AccountId: z.string().uuid(),
  signalId: z.string().uuid(),
  strategyId: z.string().min(1).optional(),
  source: z.string().min(1),
  action: signalActionSchema,
  symbol: z.string().min(1).optional(),
  side: orderSideSchema.optional(),
  orderType: orderTypeSchema.optional(),
  volumeMode: volumeModeSchema.optional(),
  volumeValue: z.number().positive().optional(),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  trailing: trailingSettingsSchema,
  breakeven: breakevenSettingsSchema,
  comment: z.string().max(255).optional(),
  magicNumber: z.number().int().optional(),
  rawPayload: z.unknown(),
  receivedAt: z.string().datetime(),
  idempotencyKey: z.string().min(16),
});

export const webhookIngressRequestSchema = z.object({
  strategyId: z.string().optional(),
  sourceLabel: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  nonce: z.string().min(8).optional(),
  payload: z.union([z.record(z.any()), z.string()]),
});

export type CanonicalSignal = z.infer<typeof canonicalSignalSchema>;
export type WebhookIngressRequest = z.infer<typeof webhookIngressRequestSchema>;
