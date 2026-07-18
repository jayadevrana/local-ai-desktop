import pino from 'pino';

import { workerEnv } from '../env';

export const logger = pino({
  level: workerEnv.LOG_LEVEL,
  base: {
    service: 'tradebridge-worker',
    env: workerEnv.NODE_ENV,
  },
});
