import { Controller, Get, Module, Param, Query, UseGuards } from '@nestjs/common';

import type { AuthContext } from '../../common/auth/auth.types';
import { CurrentAuth } from '../../common/decorators/current-auth.decorator';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { PrismaService } from '../../common/prisma.service';

class ExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  listJobs(auth: AuthContext, status?: string) {
    return this.prisma.executionJob.findMany({
      where: {
        organizationId: auth.organizationId,
        status: status as never | undefined,
      },
      include: {
        mt5Account: true,
        assignedNode: true,
        terminalInstance: true,
        executionResults: {
          orderBy: { occurredAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  getJob(auth: AuthContext, jobId: string) {
    return this.prisma.executionJob.findFirstOrThrow({
      where: { id: jobId, organizationId: auth.organizationId },
      include: {
        mt5Account: true,
        assignedNode: true,
        terminalInstance: true,
        executionResults: {
          orderBy: { occurredAt: 'desc' },
        },
      },
    });
  }
}

@Controller('execution-jobs')
@UseGuards(SessionAuthGuard)
class ExecutionController {
  constructor(private readonly service: ExecutionService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query('status') status?: string) {
    return this.service.listJobs(auth, status);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.service.getJob(auth, id);
  }
}

@Module({
  controllers: [ExecutionController],
  providers: [ExecutionService, PrismaService],
})
export class ExecutionModule {}
