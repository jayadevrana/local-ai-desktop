import { describe, expect, it } from 'vitest';

import { normalizeSignalFromTemplate, parseCompactTextPayload, parseKvPayload } from '../src';

describe('parser engine', () => {
  it('parses kv payloads', () => {
    expect(parseKvPayload('action=buy,symbol=EURUSD,risk=1')).toEqual({
      action: 'buy',
      symbol: 'EURUSD',
      risk: '1',
    });
  });

  it('parses compact text payloads', () => {
    expect(parseCompactTextPayload('buy symbol:NAS100 risk:1.25')).toEqual({
      action: 'buy',
      symbol: 'NAS100',
      risk: '1.25',
    });
  });

  it('normalizes payloads into canonical signal shape', () => {
    const normalized = normalizeSignalFromTemplate({
      organizationId: '11111111-1111-1111-1111-111111111111',
      mt5AccountId: '22222222-2222-2222-2222-222222222222',
      tenantId: '11111111-1111-1111-1111-111111111111',
      source: 'tradingview',
      idempotencyKey: 'abcdefghijklmnopqrstuvwxyz',
      payload: 'action=buy,symbol=EURUSD,risk=1,sl=1.0865,tp=1.0940',
      receivedAt: '2026-04-12T00:00:00.000Z',
      template: {
        name: 'KV Default',
        format: 'KV',
        fieldMappings: [
          { sourceKey: 'action', targetField: 'action', required: true },
          { sourceKey: 'symbol', targetField: 'symbol', required: true },
          { sourceKey: 'risk', targetField: 'volumeValue', required: false },
          { sourceKey: 'sl', targetField: 'stopLoss', required: false },
          { sourceKey: 'tp', targetField: 'takeProfit', required: false },
        ],
        allowedStrategyIds: [],
        isDefault: true,
      },
    });

    expect(normalized.action).toBe('BUY_MARKET');
    expect(normalized.symbol).toBe('EURUSD');
    expect(normalized.volumeValue).toBe(1);
  });
});
