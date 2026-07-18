import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'node:crypto';

import { StructuredLogger } from '../logging/structured-logger.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      id?: string;
      method: string;
      url: string;
      headers: Record<string, string | undefined>;
      auth?: { organizationId?: string; userId?: string };
    }>();
    const response = context.switchToHttp().getResponse<{ setHeader(name: string, value: string): void; statusCode: number }>();

    const requestId = request.headers['x-request-id'] ?? randomUUID();
    request.id = requestId;
    response.setHeader('x-request-id', requestId);

    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info('request completed', {
            requestId,
            method: request.method,
            url: request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - start,
            organizationId: request.auth?.organizationId,
            userId: request.auth?.userId,
          });
        },
      }),
    );
  }
}
