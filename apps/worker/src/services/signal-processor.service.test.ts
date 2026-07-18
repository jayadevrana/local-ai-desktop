import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SignalProcessorService', () => {
  let SignalProcessorService: typeof import('./signal-processor.service').SignalProcessorService;

  const prisma = {
    signalEvent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    executionJob: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.API_INTERNAL_BASE_URL = 'http://localhost:3001/api';
    process.env.ENCRYPTION_MASTER_KEY = 'test-test-test-test-test-test-test-test';
    ({ SignalProcessorService } = await import('./signal-processor.service'));
  });

  it('normalizes a signal and creates a dispatch job', async () => {
    prisma.signalEvent.findUnique.mockResolvedValue({
      id: 'signal-1',
      organizationId: '11111111-1111-1111-1111-111111111111',
      mt5AccountId: '22222222-2222-2222-2222-222222222222',
      sourceLabel: 'tradingview',
      idempotencyKey: 'abcdefghijklmnopqrstuvwxyz',
      rawPayload: {
        action: 'buy',
        symbol: 'EURUSD',
        risk: '1',
      },
      receivedAt: new Date('2026-04-13T00:00:00.000Z'),
      correlationId: 'corr-1',
      strategyId: 'strategy-a',
      parserTemplate: {
        name: 'Default KV',
        format: 'KV',
        isDefault: true,
        definition: {
          fieldMappings: [
            { sourceKey: 'action', targetField: 'action', required: true },
            { sourceKey: 'symbol', targetField: 'symbol', required: true },
            { sourceKey: 'risk', targetField: 'volumeValue' },
          ],
          allowedStrategyIds: ['strategy-a'],
        },
      },
      mt5Account: {
        assignedNodeId: 'node-1',
        assignedNode: { id: 'node-1' },
        terminalInstance: { id: 'terminal-1' },
        riskProfile: null,
        symbolMappings: [],
      },
    });
    prisma.executionJob.findFirst.mockResolvedValue(null);
    prisma.executionJob.create.mockResolvedValue({ id: 'job-1', status: 'DISPATCHED' });
    prisma.signalEvent.update.mockResolvedValue({ id: 'signal-1' });

    const service = new SignalProcessorService(prisma as never);
    const result = await service.process('signal-1');

    expect(result).toEqual({ id: 'job-1', status: 'DISPATCHED' });
    expect(prisma.executionJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        signalEventId: 'signal-1',
        assignedNodeId: 'node-1',
        terminalInstanceId: 'terminal-1',
        status: 'DISPATCHED',
        executionPayload: expect.objectContaining({
          action: 'BUY_MARKET',
          symbol: 'EURUSD',
          volumeValue: 1,
        }),
      }),
    });
    expect(prisma.signalEvent.update).toHaveBeenCalledWith({
      where: { id: 'signal-1' },
      data: expect.objectContaining({
        signalAction: 'BUY_MARKET',
        status: 'DISPATCHED',
      }),
    });
  });

  it('returns an existing routed job for duplicate processing', async () => {
    prisma.signalEvent.findUnique.mockResolvedValue({
      id: 'signal-1',
      organizationId: '11111111-1111-1111-1111-111111111111',
      mt5AccountId: '22222222-2222-2222-2222-222222222222',
      sourceLabel: 'tradingview',
      idempotencyKey: 'abcdefghijklmnopqrstuvwxyz',
      rawPayload: { action: 'buy' },
      receivedAt: new Date('2026-04-13T00:00:00.000Z'),
      correlationId: 'corr-1',
      strategyId: null,
      parserTemplate: {
        name: 'Default KV',
        format: 'KV',
        isDefault: true,
        definition: { fieldMappings: [] },
      },
      mt5Account: {
        assignedNodeId: 'node-1',
        assignedNode: { id: 'node-1' },
        terminalInstance: { id: 'terminal-1' },
        riskProfile: null,
        symbolMappings: [],
      },
    });
    prisma.executionJob.findFirst.mockResolvedValue({ id: 'job-existing', status: 'SUCCEEDED' });

    const service = new SignalProcessorService(prisma as never);
    const result = await service.process('signal-1');

    expect(result).toEqual({ id: 'job-existing', status: 'SUCCEEDED' });
    expect(prisma.executionJob.create).not.toHaveBeenCalled();
  });
});
