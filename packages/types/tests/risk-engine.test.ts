import { describe, expect, it } from 'vitest';

import { calculateRiskResolution } from '../src';

describe('risk engine', () => {
  const symbolSpec = {
    symbol: 'EURUSD',
    contractSize: 100000,
    tickSize: 0.0001,
    tickValue: 10,
    volumeMin: 0.01,
    volumeMax: 100,
    volumeStep: 0.01,
    digits: 5,
  };

  it('returns fixed lot size unchanged when in bounds', () => {
    const result = calculateRiskResolution({
      balance: 10000,
      equity: 10000,
      requestedVolumeMode: 'LOTS',
      requestedVolumeValue: 0.5,
      symbolSpec,
    });

    expect(result.finalLots).toBe(0.5);
    expect(result.clamped).toBe(false);
  });

  it('derives lots from equity risk', () => {
    const result = calculateRiskResolution({
      balance: 10000,
      equity: 10000,
      stopLossPips: 20,
      requestedVolumeMode: 'RISK_PERCENT_EQUITY',
      requestedVolumeValue: 1,
      symbolSpec,
    });

    expect(result.finalLots).toBeGreaterThan(0);
    expect(result.reason).toContain('equity');
  });
});
