import { Controller, Headers, Module, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { webhookIngressRequestSchema } from '@tradebridge/types';

import { PrismaService } from '../../common/prisma.service';
import { QueueService } from '../../common/queue/queue.service';
import { AuditService } from '../../domain/audit/audit.service';
import { CryptoService } from '../../domain/crypto/crypto.service';
import { ParserService } from '../../domain/parser/parser.service';

class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly crypto: CryptoService,
    private readonly parserService: ParserService,
    private readonly audit: AuditService,
  ) {}

  async ingest(token: string, payload: typeof webhookIngressRequestSchema._type, rawBody: string, signature?: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { tokenHash: this.crypto.hash(token) },
      include: {
        parserTemplate: true,
        mt5Account: true,
      },
    });

    if (!endpoint || !endpoint.isActive || endpoint.status !== 'ACTIVE') {
      throw new UnauthorizedException('Webhook endpoint not found');
    }

    const requestsLastMinute = await this.prisma.signalEvent.count({
      where: {
        webhookEndpointId: endpoint.id,
        receivedAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });
    if (requestsLastMinute >= endpoint.requestsPerMinute) {
      return { accepted: false, reason: 'rate_limit_exceeded' };
    }

    if (signature && endpoint.secretHash) {
      const provided = signature.replace(/^sha256=/i, '');
      if (!this.crypto.timingSafeHashCompare(endpoint.secretHash, this.crypto.hash(provided))) {
        throw new UnauthorizedException('Webhook signature is invalid');
      }
    }

    const rawPayload = endpoint.parserTemplate
      ? this.parserService.parseRawPayload(endpoint.parserTemplate.format, typeof payload.payload === 'string' ? payload.payload : JSON.stringify(payload.payload))
      : payload.payload;
    const idempotencyKey = this.crypto.hash(
      `${endpoint.id}:${rawBody}:${payload.strategyId ?? ''}:${payload.nonce ?? ''}:${payload.timestamp ?? ''}`,
    );

    const existing = await this.prisma.signalEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return { accepted: true, deduplicated: true, signalEventId: existing.id };
    }

    const signalEvent = await this.prisma.signalEvent.create({
      data: {
        organizationId: endpoint.organizationId,
        mt5AccountId: endpoint.mt5AccountId,
        webhookEndpointId: endpoint.id,
        parserTemplateId: endpoint.parserTemplateId,
        sourceLabel: endpoint.sourceLabel,
        strategyId: payload.strategyId,
        rawPayload,
        rawPayloadText: rawBody,
        idempotencyKey,
        correlationId: randomUUID(),
        status: 'RECEIVED',
      },
    });

    await this.prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { lastUsedAt: new Date() },
    });

    await this.queueService.signalIngressQueue.add(
      'signal.ingress',
      { signalEventId: signalEvent.id },
      {
        jobId: idempotencyKey,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1_000,
        },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );

    await this.audit.record({
      organizationId: endpoint.organizationId,
      action: 'webhook.received',
      resourceType: 'SignalEvent',
      resourceId: signalEvent.id,
      metadata: {
        mt5AccountId: endpoint.mt5AccountId,
        strategyId: payload.strategyId,
      },
    });

    return {
      accepted: true,
      signalEventId: signalEvent.id,
      correlationId: signalEvent.correlationId,
    };
  }
}

@Controller('v1/webhooks/tradingview')
class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post(':webhookToken')
  ingest(
    @Param('webhookToken') webhookToken: string,
    @Headers('x-tradebridge-signature') signature?: string,
    @Req() request?: { body?: unknown },
  ) {
    const rawBody = typeof request?.body === 'string' ? request.body : JSON.stringify(request?.body ?? {});
    const parsed = (() => {
      if (typeof request?.body === 'string') {
        try {
          const json = JSON.parse(request.body);
          return webhookIngressRequestSchema.parse(json);
        } catch {
          return webhookIngressRequestSchema.parse({ payload: request.body });
        }
      }
      return webhookIngressRequestSchema.parse(request?.body ?? {});
    })();
    return this.service.ingest(webhookToken, parsed, rawBody, signature);
  }
}

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, PrismaService, QueueService, CryptoService, ParserService, AuditService],
})
export class WebhooksModule {}
