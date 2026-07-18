import { z } from 'zod';

import { volumeModes } from './enums';

export const riskVolumeModeSchema = z.enum(volumeModes);

export const riskProfileSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  defaultVolumeMode: riskVolumeModeSchema,
  defaultVolumeValue: z.number().positive(),
  maxLotCap: z.number().positive().optional(),
  minLot: z.number().positive().optional(),
  lotStep: z.number().positive().default(0.01),
  fallbackStopLossPips: z.number().positive().optional(),
  allowBrokerMinLotOverride: z.boolean().default(true),
});

export const symbolSpecSchema = z.object({
  symbol: z.string().min(1),
  contractSize: z.number().positive(),
  tickSize: z.number().positive(),
  tickValue: z.number().positive(),
  volumeMin: z.number().positive(),
  volumeMax: z.number().positive(),
  volumeStep: z.number().positive(),
  digits: z.number().int().min(0).max(10),
});

export const riskResolutionRequestSchema = z.object({
  balance: z.number().positive(),
  equity: z.number().positive(),
  stopLossPips: z.number().positive().optional(),
  requestedVolumeMode: riskVolumeModeSchema,
  requestedVolumeValue: z.number().positive(),
  profile: riskProfileSchema.optional(),
  symbolSpec: symbolSpecSchema,
});

export const riskResolutionResultSchema = z.object({
  finalLots: z.number().positive(),
  roundedLots: z.number().positive(),
  clamped: z.boolean(),
  reason: z.string(),
});

export type RiskProfileInput = z.infer<typeof riskProfileSchema>;
export type SymbolSpec = z.infer<typeof symbolSpecSchema>;
export type RiskResolutionRequest = z.infer<typeof riskResolutionRequestSchema>;
export type RiskResolutionResult = z.infer<typeof riskResolutionResultSchema>;
