import { Injectable } from '@nestjs/common';
import { parseCompactTextPayload, parseKvPayload, ParserTemplateInput } from '@tradebridge/types';

@Injectable()
export class ParserService {
  parseRawPayload(format: ParserTemplateInput['format'], rawPayload: string | Record<string, unknown>) {
    if (typeof rawPayload !== 'string') {
      return rawPayload;
    }

    switch (format) {
      case 'JSON':
        return JSON.parse(rawPayload);
      case 'KV':
        return parseKvPayload(rawPayload);
      case 'TEXT':
        return parseCompactTextPayload(rawPayload);
      default:
        return rawPayload;
    }
  }
}
