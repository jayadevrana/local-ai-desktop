import { Body, Controller, Headers, Module, Param, Post, UnauthorizedException } from '@nestjs/common';
import {
  executionResultReportSchema,
  nodeHeartbeatSchema,
  nodeRegistrationSchema,
} from '@tradebridge/types';

import { PrismaService } from '../../common/prisma.service';
import { ZodValidationPipe } from '../../common/security/zod-validation.pipe';
import { AuditService } from '../../domain/audit/audit.service';
import { CryptoService } from '../../domain/crypto/crypto.service';

class NodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  async register(input: typeof nodeRegistrationSchema._type) {
    const authToken = this.crypto.randomToken(32);
    const node = await this.prisma.windowsNode.create({
      data: {
        nodeName: input.nodeName,
        hostname: input.hostname,
        nodeAuthTokenHash: this.crypto.hash(authToken),
        capabilities: input.capabilities,
        maxAccounts: input.maxAccounts,
        agentVersion: input.agentVersion,
        heartbeatIntervalSeconds: input.heartbeatIntervalSeconds,
        status: 'ACTIVE',
      },
    });

    return {
      nodeId: node.id,
      authToken,
      heartbeatIntervalSeconds: node.heartbeatIntervalSeconds,
    };
  }

  async heartbeat(nodeId: string, bearerToken: string | undefined, input: typeof nodeHeartbeatSchema._type) {
    const node = await this.authenticateNode(nodeId, bearerToken);
    await this.prisma.$transaction([
      this.prisma.windowsNode.update({
        where: { id: node.id },
        data: {
          status: input.status,
          lastHeartbeatAt: new Date(),
          metadata: input.diagnostics,
        },
      }),
      this.prisma.nodeHeartbeat.create({
        data: {
          nodeId: node.id,
          status: input.status,
          cpuLoadPercent: input.cpuLoadPercent,
          memoryUsedMb: input.memoryUsedMb,
          activeTerminalCount: input.activeTerminalCount,
          queuedJobCount: input.queuedJobCount,
          diagnostics: input.diagnostics,
        },
      }),
    ]);

    return { ok: true };
  }

  async pullJobs(nodeId: string, bearerToken: string | undefined, limit = 10) {
    await this.authenticateNode(nodeId, bearerToken);

    const jobs = await this.prisma.executionJob.findMany({
      where: {
        assignedNodeId: nodeId,
        status: { in: ['DISPATCHED', 'RETRYING'] },
        availableAt: { lte: new Date() },
      },
      include: {
        mt5Account: {
          include: {
            credentialSecretRef: true,
            symbolMappings: true,
            riskProfile: true,
            terminalInstance: true,
          },
        },
        signalEvent: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    const claimedIds = jobs.map((job) => job.id);
    if (claimedIds.length > 0) {
      await this.prisma.executionJob.updateMany({
        where: { id: { in: claimedIds } },
        data: {
          status: 'CLAIMED',
          claimedAt: new Date(),
          timeoutAt: new Date(Date.now() + 60 * 1000),
        },
      });
    }

    return jobs.map((job) => ({
      jobId: job.id,
      signal: job.executionPayload,
      credentials: job.mt5Account.credentialSecretRef
        ? this.crypto.decryptJson<{
            login: string;
            password: string;
            serverName: string;
            brokerName: string;
          }>({
            cipherText: job.mt5Account.credentialSecretRef.cipherText,
            iv: job.mt5Account.credentialSecretRef.iv,
            authTag: job.mt5Account.credentialSecretRef.authTag,
          })
        : undefined,
      terminal: job.mt5Account.terminalInstance,
      symbolMappings: job.mt5Account.symbolMappings,
      riskProfile: job.mt5Account.riskProfile,
    }));
  }

  async reportResult(
    nodeId: string,
    bearerToken: string | undefined,
    jobId: string,
    input: typeof executionResultReportSchema._type,
  ) {
    await this.authenticateNode(nodeId, bearerToken);

    const job = await this.prisma.executionJob.findUniqueOrThrow({ where: { id: jobId } });
    const nextAttempt = await this.prisma.executionResult.count({ where: { executionJobId: jobId } });

    await this.prisma.$transaction([
      this.prisma.executionResult.create({
        data: {
          executionJobId: jobId,
          attemptNumber: nextAttempt + 1,
          status: input.status,
          brokerOrderId: input.brokerOrderId,
          brokerDealId: input.brokerDealId,
          retcode: input.retcode,
          message: input.message,
          details: input.details,
          occurredAt: new Date(input.occurredAt),
        },
      }),
      this.prisma.executionJob.update({
        where: { id: jobId },
        data: {
          status: input.status,
          completedAt: ['SUCCEEDED', 'FAILED', 'DEAD_LETTER'].includes(input.status) ? new Date() : undefined,
          lastError: input.status === 'SUCCEEDED' ? null : input.message,
        },
      }),
    ]);

    await this.audit.record({
      organizationId: job.organizationId,
      action: 'node.execution.reported',
      resourceType: 'ExecutionJob',
      resourceId: jobId,
      metadata: { nodeId, status: input.status, retcode: input.retcode },
    });

    return { ok: true };
  }

  private async authenticateNode(nodeId: string, bearerToken?: string) {
    const token = bearerToken?.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw new UnauthorizedException('Missing node bearer token');
    }

    const node = await this.prisma.windowsNode.findUnique({ where: { id: nodeId } });
    if (!node || !this.crypto.timingSafeHashCompare(node.nodeAuthTokenHash, this.crypto.hash(token))) {
      throw new UnauthorizedException('Invalid node credentials');
    }
    return node;
  }
}

@Controller('nodes')
class NodesController {
  constructor(private readonly service: NodesService) {}

  @Post('register')
  register(@Body(new ZodValidationPipe(nodeRegistrationSchema)) body: typeof nodeRegistrationSchema._type) {
    return this.service.register(body);
  }

  @Post(':nodeId/heartbeat')
  heartbeat(
    @Param('nodeId') nodeId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body(new ZodValidationPipe(nodeHeartbeatSchema)) body: typeof nodeHeartbeatSchema._type,
  ) {
    return this.service.heartbeat(nodeId, authorization, body);
  }

  @Post(':nodeId/jobs/pull')
  pullJobs(
    @Param('nodeId') nodeId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body?: { limit?: number },
  ) {
    return this.service.pullJobs(nodeId, authorization, body?.limit ?? 10);
  }

  @Post(':nodeId/jobs/:jobId/result')
  reportResult(
    @Param('nodeId') nodeId: string,
    @Param('jobId') jobId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body(new ZodValidationPipe(executionResultReportSchema)) body: typeof executionResultReportSchema._type,
  ) {
    return this.service.reportResult(nodeId, authorization, jobId, body);
  }
}

@Module({
  controllers: [NodesController],
  providers: [NodesService, PrismaService, CryptoService, AuditService],
})
export class NodesModule {}
