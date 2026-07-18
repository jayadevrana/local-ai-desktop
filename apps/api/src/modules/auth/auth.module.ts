import { Module } from '@nestjs/common';

import { PrismaService } from '../../common/prisma.service';
import { CryptoService } from '../../domain/crypto/crypto.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService, CryptoService],
  exports: [AuthService],
})
export class AuthModule {}
