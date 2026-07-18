import { randomUUID } from 'node:crypto';

import { ParserTemplateInput } from '../parser';
import { canonicalSignalSchema, type CanonicalSignal } from '../signal';

const actionMap: Record<string, CanonicalSignal['action']> = {
  buy: 'BUY_MARKET',
  sell: 'SELL_MARKET',
  buylimit: 'BUY_LIMIT',
  selllimit: 'SELL_LIMIT',
  buystop: 'BUY_STOP',
  sellstop: 'SELL_STOP',
  closeall: 'CLOSE_ALL',
  closesymbol: 'CLOSE_SYMBOL',
  closebuy: 'CLOSE_BUY',
  closesell: 'CLOSE_SELL',
  closebymagic: 'CLOSE_BY_MAGIC',
  partialclose: 'PARTIAL_CLOSE',
  movesl: 'MOVE_SL',
  movetp: 'MOVE_TP',
  breakeven: 'MOVE_TO_BREAKEVEN',
  reverse: 'REVERSE_POSITION',
  cancelpending: 'CANCEL_PENDING',
  cancelallpending: 'CANCEL_ALL_PENDING',
};

export const parseKvPayload = (payload: string): Record<string, string> => {
  const pairs = payload
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return pairs.reduce<Record<string, string>>((acc, pair) => {
    const [key, ...rest] = pair.split('=');
    if (!key || rest.length === 0) {
      return acc;
    }

    acc[key.trim()] = rest.join('=').trim();
    return acc;
  }, {});
};

export const parseCompactTextPayload = (payload: string): Record<string, string> => {
  const [firstToken, ...rest] = payload.trim().split(/\s+/);
  const result: Record<string, string> = {};

  if (firstToken) {
    result.action = firstToken;
  }

  for (const token of rest) {
    const [key, value] = token.split(':');
    if (key && value) {
      result[key.toLowerCase()] = value;
    }
  }

  return result;
};

export const normalizeAction = (value?: string): CanonicalSignal['action'] | undefined => {
  if (!value) {
    return undefined;
  }

  return actionMap[value.toLowerCase().replace(/[\s_-]/g, '')];
};

export const normalizeSignalFromTemplate = ({
  organizationId,
  mt5AccountId,
  signalId = randomUUID(),
  tenantId,
  source,
  idempotencyKey,
  payload,
  template,
  receivedAt,
}: {
  organizationId: string;
  mt5AccountId: string;
  signalId?: string;
  tenantId: string;
  source: string;
  idempotencyKey: string;
  payload: unknown;
  template: ParserTemplateInput;
  receivedAt: string;
}): CanonicalSignal => {
  const raw =
    typeof payload === 'string'
      ? template.format === 'KV'
        ? parseKvPayload(payload)
        : parseCompactTextPayload(payload)
      : (payload as Record<string, unknown>);

  const mapped = template.fieldMappings.reduce<Record<string, unknown>>((acc, mapping) => {
    const value = raw[mapping.sourceKey];
    if (value !== undefined) {
      acc[mapping.targetField] = value;
    }
    return acc;
  }, {});

  const action = normalizeAction(String(mapped.action ?? raw.action ?? template.defaultAction ?? ''));
  const side =
    action?.startsWith('BUY') ? 'BUY' : action?.startsWith('SELL') ? 'SELL' : action?.startsWith('CLOSE') ? 'FLAT' : undefined;
  const orderType = action?.includes('LIMIT')
    ? 'LIMIT'
    : action?.includes('STOP')
      ? 'STOP'
      : action?.includes('CLOSE') || action?.includes('MOVE')
        ? 'CLOSE'
        : 'MARKET';

  return canonicalSignalSchema.parse({
    tenantId,
    organizationId,
    mt5AccountId,
    signalId,
    strategyId: String(mapped.strategyId ?? raw.strategyId ?? raw.strategy ?? '') || undefined,
    source,
    action,
    symbol: String(mapped.symbol ?? raw.symbol ?? raw.ticker ?? '') || undefined,
    side,
    orderType,
    volumeMode: mapped.volumeMode ?? raw.volumeMode ?? 'LOTS',
    volumeValue:
      mapped.volumeValue !== undefined || raw.volumeValue !== undefined || raw.risk !== undefined
        ? Number(mapped.volumeValue ?? raw.volumeValue ?? raw.risk)
        : undefined,
    price: mapped.price !== undefined || raw.price !== undefined ? Number(mapped.price ?? raw.price) : undefined,
    stopLoss: mapped.stopLoss !== undefined || raw.sl !== undefined ? Number(mapped.stopLoss ?? raw.sl) : undefined,
    takeProfit: mapped.takeProfit !== undefined || raw.tp !== undefined ? Number(mapped.takeProfit ?? raw.tp) : undefined,
    comment: String(mapped.comment ?? raw.comment ?? '') || undefined,
    magicNumber:
      mapped.magicNumber !== undefined || raw.magic !== undefined ? Number(mapped.magicNumber ?? raw.magic) : undefined,
    rawPayload: payload,
    receivedAt,
    idempotencyKey,
  });
};
