import { Controller, Get, Module } from '@nestjs/common';

import { PrismaService } from '../../common/prisma.service';

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { ok: true };
  }

  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  }
}

@Module({
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
