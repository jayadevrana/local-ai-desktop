import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import { apiEnv } from '../../env';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection = new IORedis(apiEnv.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  readonly signalIngressQueue = new Queue('signal-ingress', { connection: this.connection });
  readonly reconciliationQueue = new Queue('execution-reconciliation', { connection: this.connection });

  async onModuleDestroy() {
    await this.signalIngressQueue.close();
    await this.reconciliationQueue.close();
    await this.connection.quit();
  }
}
