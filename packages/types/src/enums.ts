export const organizationRoles = [
  'OWNER',
  'ADMIN',
  'TRADER',
  'VIEWER',
  'SUPPORT_READONLY',
] as const;

export const mt5AccountStatuses = [
  'DRAFT',
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'LOCKED',
  'ERROR',
  'ARCHIVED',
] as const;

export const parserFormats = ['JSON', 'KV', 'TEXT'] as const;

export const signalActions = [
  'BUY_MARKET',
  'SELL_MARKET',
  'BUY_LIMIT',
  'SELL_LIMIT',
  'BUY_STOP',
  'SELL_STOP',
  'CLOSE_ALL',
  'CLOSE_SYMBOL',
  'CLOSE_BUY',
  'CLOSE_SELL',
  'CLOSE_BY_MAGIC',
  'PARTIAL_CLOSE',
  'MOVE_SL',
  'MOVE_TP',
  'MOVE_TO_BREAKEVEN',
  'REVERSE_POSITION',
  'CANCEL_PENDING',
  'CANCEL_ALL_PENDING',
] as const;

export const orderSides = ['BUY', 'SELL', 'FLAT'] as const;
export const orderTypes = ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'MODIFY', 'CLOSE'] as const;
export const volumeModes = ['LOTS', 'FIXED_MONEY', 'RISK_PERCENT_EQUITY', 'RISK_PERCENT_BALANCE'] as const;
export const executionJobStatuses = [
  'RECEIVED',
  'QUEUED',
  'ROUTED',
  'DISPATCHED',
  'CLAIMED',
  'EXECUTING',
  'SUCCEEDED',
  'FAILED',
  'RETRYING',
  'DEAD_LETTER',
  'CANCELED',
] as const;

export const nodeStatuses = ['PENDING', 'ACTIVE', 'DEGRADED', 'DRAINING', 'OFFLINE', 'DISABLED'] as const;
export const terminalStatuses = ['PROVISIONING', 'STARTING', 'ONLINE', 'OFFLINE', 'ERROR', 'RESTARTING'] as const;
export const authFactors = ['PASSWORD', 'MAGIC_LINK', 'TOTP'] as const;
