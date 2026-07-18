import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class RoutingService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveNodeForAccount(mt5AccountId: string) {
    const account = await this.prisma.mt5Account.findUnique({
      where: { id: mt5AccountId },
      include: {
        assignedNode: true,
        terminalInstance: true,
      },
    });

    if (!account) {
      throw new UnprocessableEntityException('MT5 account not found');
    }

    if (account.status !== 'ACTIVE') {
      throw new UnprocessableEntityException(`Account is not routable in status ${account.status}`);
    }

    if (!account.assignedNode || !['ACTIVE', 'DEGRADED'].includes(account.assignedNode.status)) {
      throw new UnprocessableEntityException('Assigned node is unavailable');
    }

    if (!account.terminalInstance || !['ONLINE', 'STARTING'].includes(account.terminalInstance.status)) {
      throw new UnprocessableEntityException('Terminal instance is not online');
    }

    return {
      node: account.assignedNode,
      terminalInstance: account.terminalInstance,
      account,
    };
  }
}
