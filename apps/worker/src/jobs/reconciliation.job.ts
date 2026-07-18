import { Job } from 'bullmq';
import { PrismaClient } from '@tradebridge/db';

import { logger } from '../lib/logger';

export const handleReconciliationJob = async (
  job: Job<{ mt5AccountId?: string; nodeId?: string }>,
  prisma: PrismaClient,
) => {
  if (job.name === 'terminal.provision' && job.data.mt5AccountId) {
    await prisma.mt5Account.update({
      where: { id: job.data.mt5AccountId },
      data: { status: 'ACTIVE' },
    });

    await prisma.terminalInstance.updateMany({
      where: { mt5AccountId: job.data.mt5AccountId },
      data: { status: 'STARTING' },
    });

    logger.info(job.data, 'terminal provision task processed');
    return { ok: true };
  }

  return { ignored: true };
};
