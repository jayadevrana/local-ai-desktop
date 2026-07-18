import { Body, Controller, Get, Module, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createMt5AccountSchema,
  parserTemplateSchema,
  riskProfileSchema,
  rotateWebhookSecretSchema,
  symbolMappingSchema,
  updateMt5AccountSchema,
} from '@tradebridge/types';

import type { AuthContext } from '../../common/auth/auth.types';
import { CurrentAuth } from '../../common/decorators/current-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { ZodValidationPipe } from '../../common/security/zod-validation.pipe';
import { PrismaService } from '../../common/prisma.service';
import { QueueService } from '../../common/queue/queue.service';
import { AuditService } from '../../domain/audit/audit.service';
import { CryptoService } from '../../domain/crypto/crypto.service';

class Mt5AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly queueService: QueueService,
  ) {}

  async list(auth: AuthContext) {
    return this.prisma.mt5Account.findMany({
      where: {
        organizationId: auth.organizationId,
        deletedAt: null,
      },
      include: {
        assignedNode: true,
        terminalInstance: true,
        webhooks: true,
        symbolMappings: true,
        riskProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(auth: AuthContext, accountId: string) {
    return this.prisma.mt5Account.findFirstOrThrow({
      where: { id: accountId, organizationId: auth.organizationId, deletedAt: null },
      include: {
        webhooks: true,
        parserTemplates: true,
        symbolMappings: true,
        riskProfile: true,
        terminalInstance: true,
        assignedNode: true,
      },
    });
  }

  async create(auth: AuthContext, input: typeof createMt5AccountSchema._type) {
    const node = await this.prisma.windowsNode.findFirst({
      where: { status: { in: ['ACTIVE', 'DEGRADED'] } },
      orderBy: { mt5Accounts: { _count: 'asc' } },
    });

    if (!node) {
      throw new Error('No healthy Windows nodes available for provisioning');
    }

    const encryptedCredentials = this.crypto.encryptJson({
      login: input.login,
      password: input.password,
      serverName: input.serverName,
      brokerName: input.brokerName,
    });

    const createdRiskProfile = input.defaultRiskProfile
      ? await this.prisma.riskProfile.create({
          data: {
            organizationId: auth.organizationId,
            name: `${input.nickname} Default Risk`,
            defaultVolumeMode: input.defaultRiskProfile.defaultVolumeMode,
            defaultVolumeValue: input.defaultRiskProfile.defaultVolumeValue,
            maxLotCap: input.defaultRiskProfile.maxLotCap,
            minLot: input.defaultRiskProfile.minLot,
            lotStep: input.defaultRiskProfile.lotStep,
            fallbackStopLossPips: input.defaultRiskProfile.fallbackStopLossPips,
            allowBrokerMinLotOverride: input.defaultRiskProfile.allowBrokerMinLotOverride,
          },
        })
      : null;

    const created = await this.prisma.mt5Account.create({
      data: {
        organizationId: auth.organizationId,
        nickname: input.nickname,
        brokerName: input.brokerName,
        serverName: input.serverName,
        login: input.login,
        accountCurrency: input.accountCurrency,
        magicNumberBase: input.magicNumberBase,
        assignedNodeId: node.id,
        defaultRiskProfileId: createdRiskProfile?.id ?? undefined,
        status: 'PROVISIONING',
        credentialSecretRef: {
          create: encryptedCredentials,
        },
        symbolMappings: {
          createMany: {
            data: input.symbolMappings.map((mapping) => ({
              organizationId: auth.organizationId,
              externalSymbol: mapping.externalSymbol,
              brokerSymbol: mapping.brokerSymbol,
              comment: mapping.comment,
            })),
          },
        },
      },
      include: {
        riskProfile: true,
      },
    });

    const webhook = await this.createWebhookInternal(auth.organizationId, created.id, undefined, 'tradingview');
    await this.prisma.terminalInstance.create({
      data: {
        mt5AccountId: created.id,
        nodeId: node.id,
        workingDirectory: `C:\\TradeBridge\\terminals\\${created.login}`,
        dataDirectory: `C:\\TradeBridge\\data\\${created.login}`,
      },
    });

    await this.audit.record({
      organizationId: auth.organizationId,
      actorUserId: auth.userId,
      action: 'mt5-account.created',
      resourceType: 'MT5Account',
      resourceId: created.id,
      metadata: {
        brokerName: input.brokerName,
        serverName: input.serverName,
        assignedNodeId: node.id,
      },
    });

    await this.queueService.reconciliationQueue.add(
      'terminal.provision',
      { mt5AccountId: created.id, nodeId: node.id },
      { removeOnComplete: 500, removeOnFail: 1000 },
    );

    return {
      account: created,
      webhook,
    };
  }

  async update(auth: AuthContext, accountId: string, input: typeof updateMt5AccountSchema._type) {
    const account = await this.get(auth, accountId);

    const credentialUpdate =
      input.password
        ? {
            credentialSecretRef: {
              update: this.crypto.encryptJson({
                login: input.login ?? account.login,
                password: input.password,
                serverName: input.serverName ?? account.serverName,
                brokerName: input.brokerName ?? account.brokerName,
              }),
            },
          }
        : {};

    const updated = await this.prisma.mt5Account.update({
      where: { id: accountId },
      data: {
        nickname: input.nickname,
        brokerName: input.brokerName,
        serverName: input.serverName,
        login: input.login,
        accountCurrency: input.accountCurrency,
        magicNumberBase: input.magicNumberBase,
        status: input.status,
        ...credentialUpdate,
      },
    });

    await this.audit.record({
      organizationId: auth.organizationId,
      actorUserId: auth.userId,
      action: 'mt5-account.updated',
      resourceType: 'MT5Account',
      resourceId: accountId,
    });

    return updated;
  }

  async rotateWebhook(auth: AuthContext, accountId: string, rotateToken: boolean, sourceLabel?: string) {
    const account = await this.get(auth, accountId);
    const existing = await this.prisma.webhookEndpoint.findFirst({
      where: { mt5AccountId: account.id, organizationId: auth.organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await this.prisma.webhookEndpoint.update({
        where: { id: existing.id },
        data: {
          isActive: !rotateToken,
          status: rotateToken ? 'ROTATED' : existing.status,
          updatedAt: new Date(),
        },
      });
    }

    return this.createWebhookInternal(
      auth.organizationId,
      account.id,
      existing?.parserTemplateId ?? undefined,
      sourceLabel ?? existing?.sourceLabel ?? 'tradingview',
    );
  }

  async listParserTemplates(auth: AuthContext, mt5AccountId?: string) {
    return this.prisma.parserTemplate.findMany({
      where: { organizationId: auth.organizationId, mt5AccountId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  createParserTemplate(auth: AuthContext, input: typeof parserTemplateSchema._type) {
    return this.prisma.parserTemplate.create({
      data: {
        organizationId: auth.organizationId,
        mt5AccountId: input.mt5AccountId,
        name: input.name,
        format: input.format,
        presetKey: input.presetKey,
        definition: {
          fieldMappings: input.fieldMappings,
          defaultAction: input.defaultAction,
          allowedStrategyIds: input.allowedStrategyIds,
        },
        samplePayload: input.samplePayload,
        isDefault: input.isDefault,
      },
    });
  }

  listRiskProfiles(auth: AuthContext) {
    return this.prisma.riskProfile.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createRiskProfile(auth: AuthContext, input: typeof riskProfileSchema._type) {
    return this.prisma.riskProfile.create({
      data: {
        organizationId: auth.organizationId,
        name: input.name,
        defaultVolumeMode: input.defaultVolumeMode,
        defaultVolumeValue: input.defaultVolumeValue,
        maxLotCap: input.maxLotCap,
        minLot: input.minLot,
        lotStep: input.lotStep,
        fallbackStopLossPips: input.fallbackStopLossPips,
        allowBrokerMinLotOverride: input.allowBrokerMinLotOverride,
      },
    });
  }

  async replaceSymbolMappings(auth: AuthContext, mt5AccountId: string, mappings: Array<typeof symbolMappingSchema._type>) {
    await this.prisma.symbolMapping.deleteMany({
      where: { organizationId: auth.organizationId, mt5AccountId },
    });

    return this.prisma.symbolMapping.createMany({
      data: mappings.map((mapping) => ({
        organizationId: auth.organizationId,
        mt5AccountId,
        externalSymbol: mapping.externalSymbol,
        brokerSymbol: mapping.brokerSymbol,
        comment: mapping.comment,
      })),
    });
  }

  private async createWebhookInternal(
    organizationId: string,
    mt5AccountId: string,
    parserTemplateId?: string,
    sourceLabel = 'tradingview',
  ) {
    const token = this.crypto.randomToken(24);
    const secret = this.crypto.randomToken(24);

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        organizationId,
        mt5AccountId,
        parserTemplateId,
        sourceLabel,
        tokenHash: this.crypto.hash(token),
        tokenPrefix: token.slice(0, 6),
        secretHash: this.crypto.hash(secret),
        allowedStrategyIds: [],
      },
    });

    return {
      id: endpoint.id,
      webhookUrl: `/api/v1/webhooks/tradingview/${token}`,
      webhookToken: token,
      webhookSecret: secret,
    };
  }
}

@Controller('mt5-accounts')
@UseGuards(SessionAuthGuard, RolesGuard)
class Mt5AccountsController {
  constructor(private readonly service: Mt5AccountsService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.service.list(auth);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id') id: string) {
    return this.service.get(auth, id);
  }

  @Roles('OWNER', 'ADMIN', 'TRADER')
  @Post()
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createMt5AccountSchema)) body: typeof createMt5AccountSchema._type,
  ) {
    return this.service.create(auth, body);
  }

  @Roles('OWNER', 'ADMIN', 'TRADER')
  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMt5AccountSchema)) body: typeof updateMt5AccountSchema._type,
  ) {
    return this.service.update(auth, id, body);
  }

  @Roles('OWNER', 'ADMIN')
  @Post(':id/rotate-webhook')
  rotateWebhook(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rotateWebhookSecretSchema)) body: typeof rotateWebhookSecretSchema._type,
  ) {
    return this.service.rotateWebhook(auth, id, body.rotateToken, body.sourceLabel);
  }

  @Get('parser-templates/all')
  templates(@CurrentAuth() auth: AuthContext, @Query('mt5AccountId') mt5AccountId?: string) {
    return this.service.listParserTemplates(auth, mt5AccountId);
  }

  @Roles('OWNER', 'ADMIN', 'TRADER')
  @Post('parser-templates')
  createTemplate(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(parserTemplateSchema)) body: typeof parserTemplateSchema._type,
  ) {
    return this.service.createParserTemplate(auth, body);
  }

  @Get('risk-profiles/all')
  riskProfiles(@CurrentAuth() auth: AuthContext) {
    return this.service.listRiskProfiles(auth);
  }

  @Roles('OWNER', 'ADMIN', 'TRADER')
  @Post('risk-profiles')
  createRiskProfile(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(riskProfileSchema)) body: typeof riskProfileSchema._type,
  ) {
    return this.service.createRiskProfile(auth, body);
  }

  @Roles('OWNER', 'ADMIN', 'TRADER')
  @Post(':id/symbol-mappings')
  replaceSymbolMappings(
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(symbolMappingSchema.array())) body: Array<typeof symbolMappingSchema._type>,
  ) {
    return this.service.replaceSymbolMappings(auth, id, body);
  }
}

@Module({
  controllers: [Mt5AccountsController],
  providers: [Mt5AccountsService, PrismaService, CryptoService, AuditService, QueueService],
})
export class Mt5AccountsModule {}
