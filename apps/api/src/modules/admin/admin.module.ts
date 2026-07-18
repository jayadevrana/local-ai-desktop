import { Controller, Get, Module, Param, Post, Query, UseGuards } from '@nestjs/common';

import type { AuthContext } from '../../common/auth/auth.types';
import { CurrentAuth } from '../../common/decorators/current-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { PrismaService } from '../../common/prisma.service';
import { QueueService } from '../../common/queue/queue.service';
import { AuditService } from '../../domain/audit/audit.service';

class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly audit: AuditService,
  ) {}

  organizations() {
    return this.prisma.organization.findMany({
      include: {
        subscriptions: { include: { subscriptionPlan: true } },
        mt5Accounts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  nodes() {
    return this.prisma.windowsNode.findMany({
      include: {
        terminalInstances: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  jobs(status?: string) {
    return this.prisma.executionJob.findMany({
      where: {
        status: status as never | undefined,
      },
      include: {
        mt5Account: true,
        assignedNode: true,
        signalEvent: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async replayJob(auth: AuthContext, jobId: string) {
    const job = await this.prisma.executionJob.findUniqueOrThrow({
      where: { id: jobId },
    });

    const replay = await this.prisma.executionJob.create({
      data: {
        organizationId: job.organizationId,
        mt5AccountId: job.mt5AccountId,
        signalEventId: job.signalEventId,
        assignedNodeId: job.assignedNodeId,
        terminalInstanceId: job.terminalInstanceId,
        status: 'DISPATCHED',
        queueName: job.queueName,
        priority: job.priority,
        maxRetries: job.maxRetries,
        correlationId: `${job.correlationId}-replay`,
        executionPayload: job.executionPayload as never,
      },
    });

    await this.audit.record({
      organizationId: job.organizationId,
      actorUserId: auth.userId,
      action: 'admin.execution.replayed',
      resourceType: 'ExecutionJob',
      resourceId: replay.id,
      metadata: { originalJobId: job.id },
    });

    return replay;
  }

  async systemHealth() {
    const [dbTime, signalQueueCounts, reconciliationCounts] = await Promise.all([
      this.prisma.$queryRaw`SELECT NOW()`,
      this.queue.signalIngressQueue.getJobCounts(),
      this.queue.reconciliationQueue.getJobCounts(),
    ]);

    return {
      database: 'ok',
      databaseTime: dbTime,
      queues: {
        signalIngress: signalQueueCounts,
        reconciliation: reconciliationCounts,
      },
    };
  }
}

@Controller('admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'SUPPORT_READONLY')
class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('organizations')
  organizations() {
    return this.service.organizations();
  }

  @Get('nodes')
  nodes() {
    return this.service.nodes();
  }

  @Get('jobs')
  jobs(@Query('status') status?: string) {
    return this.service.jobs(status);
  }

  @Post('jobs/:jobId/replay')
  replayJob(@CurrentAuth() auth: AuthContext, @Param('jobId') jobId: string) {
    return this.service.replayJob(auth, jobId);
  }

  @Get('system-health')
  systemHealth() {
    return this.service.systemHealth();
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, QueueService, AuditService],
})
export class AdminModule {}
