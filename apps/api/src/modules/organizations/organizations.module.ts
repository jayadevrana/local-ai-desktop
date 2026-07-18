import { Body, Controller, Get, Module, Post, UseGuards } from '@nestjs/common';
import { inviteMemberSchema } from '@tradebridge/types';

import type { AuthContext } from '../../common/auth/auth.types';
import { CurrentAuth } from '../../common/decorators/current-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { ZodValidationPipe } from '../../common/security/zod-validation.pipe';
import { AuditService } from '../../domain/audit/audit.service';
import { PrismaService } from '../../common/prisma.service';

class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSummary(organizationId: string) {
    const [accounts, signals24h, activeNodes, activeMembers, failedJobs] = await Promise.all([
      this.prisma.mt5Account.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.signalEvent.count({
        where: {
          organizationId,
          receivedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.windowsNode.count({ where: { status: { in: ['ACTIVE', 'DEGRADED'] } } }),
      this.prisma.organizationMember.count({ where: { organizationId } }),
      this.prisma.executionJob.count({
        where: { organizationId, status: { in: ['FAILED', 'DEAD_LETTER'] } },
      }),
    ]);

    const recentSignals = await this.prisma.signalEvent.findMany({
      where: { organizationId },
      orderBy: { receivedAt: 'desc' },
      take: 5,
    });

    return {
      accounts,
      signals24h,
      activeNodes,
      activeMembers,
      failedJobs,
      recentSignals,
    };
  }

  getMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteMember(auth: AuthContext, input: { email: string; role: AuthContext['role'] }) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          fullName: input.email.split('@')[0] ?? 'Invited User',
          status: 'INVITED',
        },
      }));

    const member = await this.prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: auth.organizationId,
          userId: user.id,
        },
      },
      update: { role: input.role },
      create: {
        organizationId: auth.organizationId,
        userId: user.id,
        role: input.role,
        invitedByUserId: auth.userId,
      },
    });

    await this.audit.record({
      organizationId: auth.organizationId,
      actorUserId: auth.userId,
      action: 'organization.member.invited',
      resourceType: 'OrganizationMember',
      resourceId: member.id,
      metadata: { email: input.email, role: input.role },
    });

    return member;
  }

  getAuditLogs(organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

@Controller('organizations/current')
@UseGuards(SessionAuthGuard, RolesGuard)
class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get('summary')
  summary(@CurrentAuth() auth: AuthContext) {
    return this.service.getSummary(auth.organizationId);
  }

  @Get('members')
  members(@CurrentAuth() auth: AuthContext) {
    return this.service.getMembers(auth.organizationId);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('members')
  invite(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: { email: string; role: AuthContext['role'] },
  ) {
    return this.service.inviteMember(auth, body);
  }

  @Get('audit-logs')
  auditLogs(@CurrentAuth() auth: AuthContext) {
    return this.service.getAuditLogs(auth.organizationId);
  }
}

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PrismaService, AuditService],
})
export class OrganizationsModule {}
