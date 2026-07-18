import { z } from 'zod';

import { parserFormats, signalActions } from './enums';

export const parserFormatSchema = z.enum(parserFormats);
export const parserSignalActionSchema = z.enum(signalActions);

export const parserFieldMappingSchema = z.object({
  sourceKey: z.string().min(1),
  targetField: z.string().min(1),
  required: z.boolean().default(false),
  transform: z.string().optional(),
});

export const parserTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  mt5AccountId: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  format: parserFormatSchema,
  presetKey: z.string().min(2).max(80).optional(),
  fieldMappings: z.array(parserFieldMappingSchema).default([]),
  defaultAction: parserSignalActionSchema.optional(),
  allowedStrategyIds: z.array(z.string().min(1)).default([]),
  samplePayload: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const testParserSchema = z.object({
  parserTemplateId: z.string().uuid().optional(),
  mt5AccountId: z.string().uuid(),
  payload: z.union([z.string(), z.record(z.any())]),
});

export type ParserTemplateInput = z.infer<typeof parserTemplateSchema>;
