import { Injectable } from '@nestjs/common';
import { Prisma } from '@tradebridge/db';

import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: {
    organizationId?: string;
    actorUserId?: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata ? (JSON.parse(JSON.stringify(entry.metadata)) as Prisma.InputJsonValue) : undefined,
        ipAddress: entry.ipAddress,
      },
    });
  }
}
