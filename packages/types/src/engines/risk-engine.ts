import { riskResolutionRequestSchema, riskResolutionResultSchema, type RiskResolutionRequest } from '../risk';

const roundToStep = (value: number, step: number) => Math.floor(value / step) * step;

export const calculateRiskResolution = (input: RiskResolutionRequest) => {
  const request = riskResolutionRequestSchema.parse(input);

  const profile = request.profile;
  const stopLossPips = request.stopLossPips ?? profile?.fallbackStopLossPips;

  let baseLots: number;
  let reason = 'fixed lots input';

  switch (request.requestedVolumeMode) {
    case 'LOTS':
      baseLots = request.requestedVolumeValue;
      break;
    case 'FIXED_MONEY': {
      if (!stopLossPips) {
        throw new Error('Stop loss distance is required for fixed money risk');
      }
      baseLots = request.requestedVolumeValue / (stopLossPips * request.symbolSpec.tickValue);
      reason = 'derived from fixed money risk';
      break;
    }
    case 'RISK_PERCENT_EQUITY': {
      if (!stopLossPips) {
        throw new Error('Stop loss distance is required for percent equity risk');
      }
      const moneyRisk = (request.equity * request.requestedVolumeValue) / 100;
      baseLots = moneyRisk / (stopLossPips * request.symbolSpec.tickValue);
      reason = 'derived from equity risk percentage';
      break;
    }
    case 'RISK_PERCENT_BALANCE': {
      if (!stopLossPips) {
        throw new Error('Stop loss distance is required for percent balance risk');
      }
      const moneyRisk = (request.balance * request.requestedVolumeValue) / 100;
      baseLots = moneyRisk / (stopLossPips * request.symbolSpec.tickValue);
      reason = 'derived from balance risk percentage';
      break;
    }
  }

  const step = Math.max(Number(profile?.lotStep ?? request.symbolSpec.volumeStep), request.symbolSpec.volumeStep);
  const roundedLots = roundToStep(baseLots, step);
  const minLot = Number(profile?.minLot ?? request.symbolSpec.volumeMin);
  const maxLot = Math.min(Number(profile?.maxLotCap ?? request.symbolSpec.volumeMax), request.symbolSpec.volumeMax);
  const finalLots = Math.min(Math.max(roundedLots, minLot), maxLot);

  return riskResolutionResultSchema.parse({
    finalLots,
    roundedLots,
    clamped: finalLots !== roundedLots,
    reason,
  });
};
