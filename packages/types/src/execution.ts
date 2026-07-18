import { z } from 'zod';

import { executionJobStatuses, nodeStatuses, terminalStatuses } from './enums';
import { canonicalSignalSchema } from './signal';

export const executionJobStatusSchema = z.enum(executionJobStatuses);
export const nodeStatusSchema = z.enum(nodeStatuses);
export const terminalStatusSchema = z.enum(terminalStatuses);

export const nodeRegistrationSchema = z.object({
  nodeName: z.string().min(2).max(120),
  hostname: z.string().min(2).max(120),
  capabilities: z.array(z.string()).default([]),
  maxAccounts: z.number().int().positive(),
  agentVersion: z.string().min(1),
  platform: z.literal('windows'),
  heartbeatIntervalSeconds: z.number().int().positive().default(15),
});

export const nodeHeartbeatSchema = z.object({
  nodeId: z.string().uuid(),
  status: nodeStatusSchema,
  cpuLoadPercent: z.number().min(0).max(100),
  memoryUsedMb: z.number().nonnegative(),
  activeTerminalCount: z.number().int().nonnegative(),
  queuedJobCount: z.number().int().nonnegative(),
  diagnostics: z.record(z.any()).optional(),
});

export const executionDispatchSchema = z.object({
  jobId: z.string().uuid(),
  signal: canonicalSignalSchema,
  accountLogin: z.string().min(1),
  encryptedCredentialRef: z.object({
    secretRefId: z.string().uuid(),
    cipherText: z.string(),
    iv: z.string(),
    authTag: z.string(),
    keyVersion: z.string(),
  }),
  terminal: z.object({
    terminalInstanceId: z.string().uuid(),
    workingDirectory: z.string(),
    dataDirectory: z.string(),
    portableMode: z.boolean(),
  }),
  symbolMappings: z.array(
    z.object({
      externalSymbol: z.string(),
      brokerSymbol: z.string(),
    }),
  ),
  riskProfile: z.record(z.any()).optional(),
});

export const executionResultReportSchema = z.object({
  jobId: z.string().uuid(),
  status: executionJobStatusSchema,
  brokerOrderId: z.string().optional(),
  brokerDealId: z.string().optional(),
  retcode: z.number().int().optional(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  occurredAt: z.string().datetime(),
});

export type NodeRegistrationInput = z.infer<typeof nodeRegistrationSchema>;
export type NodeHeartbeatInput = z.infer<typeof nodeHeartbeatSchema>;
