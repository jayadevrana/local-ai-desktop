import { Controller, Get, Module, Param, Query, UseGuards } from '@nestjs/common';

import type { AuthContext } from '../../common/auth/auth.types';
import { CurrentAuth } from '../../common/decorators/current-auth.decorator';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { PrismaService } from '../../common/prisma.service';

class SignalsService {
  constructor(private readonly prisma: PrismaService) {}

  list(auth: AuthContext, status?: string, mt5AccountId?: string) {
    return this.prisma.signalEvent.findMany({
      where: {
        organizationId: auth.organizationId,
        status: status as never | undefined,
        mt5AccountId,
      },
      include: {
        mt5Account: true,
        executionJobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });
  }

  get(auth: AuthContext, signalId: string) {
    return this.prisma.signalEvent.findFirstOrThrow({
      where: { id: signalId, organizationId: auth.organizationId },
      include: {
        mt5Account: true,
        executionJobs: {
          include: {
            executionResults: true,
          },
        },
      },
    });
  }
}

@Controller('signals')
@UseGuards(SessionAuthGuard)
class SignalsController {
  constructor(private readonly service: SignalsService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query('status') status?: string,
    @Query('mt5AccountId') mt5AccountId?: string,
  ) {
    return this.service.list(auth, status, mt5AccountId);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.service.get(auth, id);
  }
}

@Module({
  controllers: [SignalsController],
  providers: [SignalsService, PrismaService],
})
export class SignalsModule {}
