import { Injectable } from '@nestjs/common';
import { calculateRiskResolution, type RiskResolutionRequest } from '@tradebridge/types';

@Injectable()
export class RiskService {
  resolve(request: RiskResolutionRequest) {
    return calculateRiskResolution(request);
  }
}
