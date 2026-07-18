import { createHash } from 'node:crypto';

import { PrismaClient, SubscriptionInterval, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function main() {
  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'starter' },
    update: {},
    create: {
      code: 'starter',
      name: 'Starter',
      interval: SubscriptionInterval.MONTHLY,
      amountCents: 4900,
      currency: 'USD',
      maxUsers: 3,
      maxMt5Accounts: 2,
      features: {
        webhooksPerAccount: 1,
        support: 'email',
      },
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'pro' },
    update: {},
    create: {
      code: 'pro',
      name: 'Pro',
      interval: SubscriptionInterval.MONTHLY,
      amountCents: 14900,
      currency: 'USD',
      maxUsers: 15,
      maxMt5Accounts: 20,
      features: {
        webhooksPerAccount: 5,
        support: 'priority',
      },
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'owner@demo.tradebridge.local' },
    update: {},
    create: {
      email: 'owner@demo.tradebridge.local',
      fullName: 'Demo Owner',
      passwordHash: hash('ChangeMeNow123!'),
      isEmailVerified: true,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-capital' },
    update: {},
    create: {
      name: 'Demo Capital',
      slug: 'demo-capital',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  await prisma.subscription.upsert({
    where: { id: 'seed-subscription-demo' },
    update: {},
    create: {
      id: 'seed-subscription-demo',
      organizationId: org.id,
      subscriptionPlanId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const riskProfile = await prisma.riskProfile.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'Default FX Risk',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Default FX Risk',
      defaultVolumeMode: 'RISK_PERCENT_EQUITY',
      defaultVolumeValue: 1.0,
      maxLotCap: 5.0,
      minLot: 0.01,
      lotStep: 0.01,
      fallbackStopLossPips: 25,
    },
  });

  const node = await prisma.windowsNode.upsert({
    where: { nodeAuthTokenHash: hash('seed-node-token') },
    update: {},
    create: {
      nodeName: 'demo-node-1',
      hostname: 'demo-windows-node',
      nodeAuthTokenHash: hash('seed-node-token'),
      capabilities: ['mt5-python'],
      maxAccounts: 25,
      agentVersion: '0.1.0',
      status: 'ACTIVE',
    },
  });

  const account = await prisma.mt5Account.upsert({
    where: {
      organizationId_login_serverName: {
        organizationId: org.id,
        login: '12345678',
        serverName: 'MetaQuotes-Demo',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      nickname: 'Primary Demo Account',
      brokerName: 'MetaQuotes',
      serverName: 'MetaQuotes-Demo',
      login: '12345678',
      accountCurrency: 'USD',
      status: 'ACTIVE',
      assignedNodeId: node.id,
      defaultRiskProfileId: riskProfile.id,
      symbolMappings: {
        createMany: {
          data: [
            { organizationId: org.id, externalSymbol: 'NAS100', brokerSymbol: 'USTEC' },
            { organizationId: org.id, externalSymbol: 'US30', brokerSymbol: 'US30.cash' },
          ],
        },
      },
      credentialSecretRef: {
        create: {
          cipherText: 'demo-ciphertext',
          iv: 'demo-iv',
          authTag: 'demo-tag',
          keyVersion: 'seed-v1',
        },
      },
      terminalInstance: {
        create: {
          nodeId: node.id,
          workingDirectory: 'C:\\TradeBridge\\terminals\\12345678',
          dataDirectory: 'C:\\TradeBridge\\data\\12345678',
          status: 'ONLINE',
        },
      },
    },
  });

  const parser = await prisma.parserTemplate.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'TradingView KV Default',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      mt5AccountId: account.id,
      name: 'TradingView KV Default',
      format: 'KV',
      isDefault: true,
      definition: {
        fieldMappings: [
          { sourceKey: 'action', targetField: 'action', required: true },
          { sourceKey: 'symbol', targetField: 'symbol', required: true },
          { sourceKey: 'risk', targetField: 'volumeValue' },
          { sourceKey: 'sl', targetField: 'stopLoss' },
          { sourceKey: 'tp', targetField: 'takeProfit' },
        ],
      },
      samplePayload: 'action=buy,symbol=EURUSD,risk=1,sl=1.0865,tp=1.0940',
    },
  });

  await prisma.webhookEndpoint.createMany({
    data: [
      {
        organizationId: org.id,
        mt5AccountId: account.id,
        parserTemplateId: parser.id,
        sourceLabel: 'tradingview',
        tokenHash: hash('demo-webhook-token'),
        tokenPrefix: 'demo',
        secretHash: hash('demo-webhook-secret'),
        allowedStrategyIds: ['strategy-demo-1'],
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed', {
    starterPlan: starterPlan.code,
    proPlan: proPlan.code,
    organization: org.slug,
    account: account.nickname,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
