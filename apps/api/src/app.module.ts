import { Module } from '@nestjs/common';

import { PrismaService } from './common/prisma.service';
import { QueueService } from './common/queue/queue.service';
import { StructuredLogger } from './common/logging/structured-logger.service';
import { AuditService } from './domain/audit/audit.service';
import { CryptoService } from './domain/crypto/crypto.service';
import { ParserService } from './domain/parser/parser.service';
import { RiskService } from './domain/risk/risk.service';
import { RoutingService } from './domain/routing/routing.service';
import { RolesGuard } from './common/guards/roles.guard';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { HealthModule } from './modules/health/health.module';
import { Mt5AccountsModule } from './modules/mt5-accounts/mt5-accounts.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SignalsModule } from './modules/signals/signals.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    Mt5AccountsModule,
    WebhooksModule,
    SignalsModule,
    ExecutionModule,
    NodesModule,
    AdminModule,
    HealthModule,
  ],
  providers: [PrismaService, QueueService, StructuredLogger, CryptoService, AuditService, ParserService, RiskService, RoutingService, RolesGuard, SessionAuthGuard],
})
export class AppModule {}
