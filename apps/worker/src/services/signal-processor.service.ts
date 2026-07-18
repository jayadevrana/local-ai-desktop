import { normalizeSignalFromTemplate } from '@tradebridge/types';
import { Prisma, PrismaClient } from '@tradebridge/db';

import { logger } from '../lib/logger';

export class SignalProcessorService {
  constructor(private readonly prisma: PrismaClient) {}

  async process(signalEventId: string) {
    const signalEvent = await this.prisma.signalEvent.findUnique({
      where: { id: signalEventId },
      include: {
        parserTemplate: true,
        mt5Account: {
          include: {
            assignedNode: true,
            terminalInstance: true,
            riskProfile: true,
            symbolMappings: true,
          },
        },
      },
    });

    if (!signalEvent) {
      throw new Error(`Signal event ${signalEventId} not found`);
    }

    if (!signalEvent.parserTemplate) {
      throw new Error(`Signal event ${signalEventId} does not have a parser template`);
    }

    if (!signalEvent.mt5Account.assignedNode || !signalEvent.mt5Account.terminalInstance) {
      throw new Error(`Signal event ${signalEventId} has no assigned execution route`);
    }

    const existingJob = await this.prisma.executionJob.findFirst({
      where: {
        signalEventId,
        status: {
          in: ['DISPATCHED', 'CLAIMED', 'EXECUTING', 'SUCCEEDED'],
        },
      },
    });
    if (existingJob) {
      return existingJob;
    }

    const definition = signalEvent.parserTemplate.definition as {
      fieldMappings?: Array<{ sourceKey: string; targetField: string; required?: boolean }>;
      defaultAction?: string;
      allowedStrategyIds?: string[];
    };

    if (
      definition.allowedStrategyIds &&
      definition.allowedStrategyIds.length > 0 &&
      signalEvent.strategyId &&
      !definition.allowedStrategyIds.includes(signalEvent.strategyId)
    ) {
      throw new Error(`Strategy ${signalEvent.strategyId} is not allowed for parser ${signalEvent.parserTemplate.name}`);
    }

    const normalized = normalizeSignalFromTemplate({
      organizationId: signalEvent.organizationId,
      mt5AccountId: signalEvent.mt5AccountId,
      tenantId: signalEvent.organizationId,
      source: signalEvent.sourceLabel,
      idempotencyKey: signalEvent.idempotencyKey,
      payload: signalEvent.rawPayload as object,
      receivedAt: signalEvent.receivedAt.toISOString(),
      template: {
        name: signalEvent.parserTemplate.name,
        format: signalEvent.parserTemplate.format,
        fieldMappings: (definition.fieldMappings ?? []).map((mapping) => ({
          sourceKey: mapping.sourceKey,
          targetField: mapping.targetField,
          required: mapping.required ?? false,
        })),
        defaultAction: definition.defaultAction as never,
        allowedStrategyIds: definition.allowedStrategyIds ?? [],
        isDefault: signalEvent.parserTemplate.isDefault,
      },
    });
    const normalizedJson = JSON.parse(JSON.stringify(normalized)) as Prisma.InputJsonValue;

    const executionJob = await this.prisma.executionJob.create({
      data: {
        organizationId: signalEvent.organizationId,
        mt5AccountId: signalEvent.mt5AccountId,
        signalEventId: signalEvent.id,
        assignedNodeId: signalEvent.mt5Account.assignedNodeId,
        terminalInstanceId: signalEvent.mt5Account.terminalInstance?.id,
        status: 'DISPATCHED',
        queueName: 'execution-dispatch',
        correlationId: signalEvent.correlationId,
        executionPayload: normalizedJson,
      },
    });

    await this.prisma.signalEvent.update({
      where: { id: signalEvent.id },
      data: {
        signalAction: normalized.action,
        normalizedPayload: normalizedJson,
        status: 'DISPATCHED',
        processedAt: new Date(),
      },
    });

    logger.info({ signalEventId, executionJobId: executionJob.id }, 'signal normalized and routed');
    return executionJob;
  }

  async markRetry(signalEventId: string, reason: string) {
    await this.prisma.signalEvent.update({
      where: { id: signalEventId },
      data: {
        status: 'RETRYING',
        lastError: reason,
      },
    });
  }

  async markDeadLetter(signalEventId: string, reason: string) {
    await this.prisma.signalEvent.update({
      where: { id: signalEventId },
      data: {
        status: 'DEAD_LETTER',
        lastError: reason,
      },
    });
  }
}
