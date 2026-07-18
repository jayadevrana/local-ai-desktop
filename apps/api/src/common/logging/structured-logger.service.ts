import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

import { apiEnv } from '../../env';
import { redactObject } from '../security/redaction';

@Injectable()
export class StructuredLogger implements LoggerService {
  private readonly logger = pino({
    level: apiEnv.LOG_LEVEL,
    base: {
      service: 'tradebridge-api',
      env: apiEnv.NODE_ENV,
    },
  });

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    this.logger.trace({ context }, message);
  }

  info(message: string, metadata: Record<string, unknown> = {}) {
    this.logger.info(redactObject(metadata), message);
  }
}
