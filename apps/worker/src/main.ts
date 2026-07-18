import { QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@tradebridge/db';

import { workerEnv } from './env';
import { handleReconciliationJob } from './jobs/reconciliation.job';
import { handleSignalIngressJob } from './jobs/signal-ingress.job';
import { logger } from './lib/logger';
import { SignalProcessorService } from './services/signal-processor.service';

const prisma = new PrismaClient();
const connection = new IORedis(workerEnv.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const signalProcessor = new SignalProcessorService(prisma);

const signalWorker = new Worker(
  workerEnv.SIGNAL_QUEUE_NAME,
  async (job) => handleSignalIngressJob(job, signalProcessor),
  {
    connection,
    concurrency: 20,
  },
);

const reconciliationWorker = new Worker(
  workerEnv.RECONCILIATION_QUEUE_NAME,
  async (job) => handleReconciliationJob(job, prisma),
  {
    connection,
    concurrency: 5,
  },
);

const signalQueueEvents = new QueueEvents(workerEnv.SIGNAL_QUEUE_NAME, { connection });

signalWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'signal worker completed');
});

signalWorker.on('failed', async (job, error) => {
  if (!job) {
    return;
  }
  const reason = error.message;
  if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
    await signalProcessor.markDeadLetter(job.data.signalEventId, reason);
  } else {
    await signalProcessor.markRetry(job.data.signalEventId, reason);
  }
  logger.error({ jobId: job.id, signalEventId: job.data.signalEventId, reason }, 'signal worker failed');
});

signalQueueEvents.on('stalled', ({ jobId }) => {
  logger.warn({ jobId }, 'signal ingress job stalled');
});

reconciliationWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, reason: error.message }, 'reconciliation worker failed');
});

const shutdown = async () => {
  await Promise.all([
    signalWorker.close(),
    reconciliationWorker.close(),
    signalQueueEvents.close(),
    prisma.$disconnect(),
    connection.quit(),
  ]);
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info('worker booted');
