import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  WEB_APP_URL: z.string().url(),
  SESSION_COOKIE_SECRET: z.string().min(32),
  ENCRYPTION_MASTER_KEY: z.string().min(32),
  WEBHOOK_HMAC_FALLBACK_SECRET: z.string().min(32),
  MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
});

export const workerEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  API_INTERNAL_BASE_URL: z.string().url(),
  ENCRYPTION_MASTER_KEY: z.string().min(32),
  SIGNAL_QUEUE_NAME: z.string().default('signal-ingress'),
  RECONCILIATION_QUEUE_NAME: z.string().default('execution-reconciliation'),
});

export const webEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(3000),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('TradeBridge Cloud'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;

export const loadApiEnv = (input: NodeJS.ProcessEnv): ApiEnv => apiEnvSchema.parse(input);
export const loadWorkerEnv = (input: NodeJS.ProcessEnv): WorkerEnv => workerEnvSchema.parse(input);
export const loadWebEnv = (input: NodeJS.ProcessEnv): WebEnv => webEnvSchema.parse(input);
