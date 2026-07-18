-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'TRADER', 'VIEWER', 'SUPPORT_READONLY');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "MT5AccountStatus" AS ENUM ('DRAFT', 'PROVISIONING', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'ERROR', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SecretStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ROTATED');

-- CreateEnum
CREATE TYPE "ParserFormat" AS ENUM ('JSON', 'KV', 'TEXT');

-- CreateEnum
CREATE TYPE "SignalAction" AS ENUM ('BUY_MARKET', 'SELL_MARKET', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP', 'CLOSE_ALL', 'CLOSE_SYMBOL', 'CLOSE_BUY', 'CLOSE_SELL', 'CLOSE_BY_MAGIC', 'PARTIAL_CLOSE', 'MOVE_SL', 'MOVE_TP', 'MOVE_TO_BREAKEVEN', 'REVERSE_POSITION', 'CANCEL_PENDING', 'CANCEL_ALL_PENDING');

-- CreateEnum
CREATE TYPE "ExecutionJobStatus" AS ENUM ('RECEIVED', 'QUEUED', 'ROUTED', 'DISPATCHED', 'CLAIMED', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'DEAD_LETTER', 'CANCELED');

-- CreateEnum
CREATE TYPE "WindowsNodeStatus" AS ENUM ('PENDING', 'ACTIVE', 'DEGRADED', 'DRAINING', 'OFFLINE', 'DISABLED');

-- CreateEnum
CREATE TYPE "TerminalInstanceStatus" AS ENUM ('PROVISIONING', 'STARTING', 'ONLINE', 'OFFLINE', 'ERROR', 'RESTARTING');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "softDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "invitedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TotpCredential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "backupCodesHash" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "TotpCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "interval" "SubscriptionInterval" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "maxOrganizations" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER NOT NULL,
    "maxMt5Accounts" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "subscriptionPlanId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskProfile" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "defaultVolumeMode" TEXT NOT NULL,
    "defaultVolumeValue" DECIMAL(18,8) NOT NULL,
    "maxLotCap" DECIMAL(18,8),
    "minLot" DECIMAL(18,8),
    "lotStep" DECIMAL(18,8) NOT NULL,
    "fallbackStopLossPips" DECIMAL(18,8),
    "allowBrokerMinLotOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mt5Account" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "brokerName" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "accountCurrency" TEXT,
    "status" "MT5AccountStatus" NOT NULL DEFAULT 'PROVISIONING',
    "symbolPreferences" JSONB,
    "magicNumberBase" INTEGER,
    "assignedNodeId" UUID,
    "defaultRiskProfileId" UUID,
    "onboardingState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Mt5Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mt5CredentialSecretRef" (
    "id" UUID NOT NULL,
    "mt5AccountId" UUID NOT NULL,
    "cipherText" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "status" "SecretStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "Mt5CredentialSecretRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "mt5AccountId" UUID NOT NULL,
    "parserTemplateId" UUID,
    "sourceLabel" TEXT NOT NULL DEFAULT 'tradingview',
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "secretHash" TEXT,
    "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedStrategyIds" TEXT[],
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParserTemplate" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "mt5AccountId" UUID,
    "name" TEXT NOT NULL,
    "format" "ParserFormat" NOT NULL,
    "presetKey" TEXT,
    "definition" JSONB NOT NULL,
    "samplePayload" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParserTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymbolMapping" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "mt5AccountId" UUID NOT NULL,
    "externalSymbol" TEXT NOT NULL,
    "brokerSymbol" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymbolMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "mt5AccountId" UUID NOT NULL,
    "webhookEndpointId" UUID NOT NULL,
    "parserTemplateId" UUID,
    "signalAction" "SignalAction",
    "sourceLabel" TEXT NOT NULL,
    "strategyId" TEXT,
    "rawPayload" JSONB NOT NULL,
    "rawPayloadText" TEXT NOT NULL,
    "normalizedPayload" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "status" "ExecutionJobStatus" NOT NULL DEFAULT 'RECEIVED',
    "lastError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SignalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WindowsNode" (
    "id" UUID NOT NULL,
    "nodeName" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "status" "WindowsNodeStatus" NOT NULL DEFAULT 'PENDING',
    "nodeAuthTokenHash" TEXT NOT NULL,
    "capabilities" TEXT[],
    "maxAccounts" INTEGER NOT NULL,
    "agentVersion" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'windows',
    "metadata" JSONB,
    "heartbeatIntervalSeconds" INTEGER NOT NULL DEFAULT 15,
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WindowsNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeHeartbeat" (
    "id" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "status" "WindowsNodeStatus" NOT NULL,
    "cpuLoadPercent" DECIMAL(5,2),
    "memoryUsedMb" INTEGER,
    "activeTerminalCount" INTEGER,
    "queuedJobCount" INTEGER,
    "diagnostics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminalInstance" (
    "id" UUID NOT NULL,
    "mt5AccountId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "terminalPath" TEXT,
    "workingDirectory" TEXT NOT NULL,
    "dataDirectory" TEXT NOT NULL,
    "portableMode" BOOLEAN NOT NULL DEFAULT true,
    "configVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "TerminalInstanceStatus" NOT NULL DEFAULT 'PROVISIONING',
    "lastSeenAt" TIMESTAMP(3),
    "processId" INTEGER,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TerminalInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionJob" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "mt5AccountId" UUID NOT NULL,
    "signalEventId" UUID NOT NULL,
    "assignedNodeId" UUID,
    "terminalInstanceId" UUID,
    "status" "ExecutionJobStatus" NOT NULL DEFAULT 'QUEUED',
    "queueName" TEXT NOT NULL DEFAULT 'signal-ingress',
    "priority" INTEGER NOT NULL DEFAULT 10,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "timeoutAt" TIMESTAMP(3),
    "correlationId" TEXT NOT NULL,
    "executionPayload" JSONB NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExecutionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionResult" (
    "id" UUID NOT NULL,
    "executionJobId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "ExecutionJobStatus" NOT NULL,
    "brokerOrderId" TEXT,
    "brokerDealId" TEXT,
    "retcode" INTEGER,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportImpersonationAudit" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "supportUserId" UUID,
    "impersonatedUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "SupportImpersonationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_expiresAt_idx" ON "MagicLinkToken"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "TotpCredential_userId_disabledAt_idx" ON "TotpCredential"("userId", "disabledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_status_idx" ON "Subscription"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RiskProfile_organizationId_idx" ON "RiskProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_organizationId_name_key" ON "RiskProfile"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Mt5Account_organizationId_status_idx" ON "Mt5Account"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Mt5Account_assignedNodeId_idx" ON "Mt5Account"("assignedNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Mt5Account_organizationId_login_serverName_key" ON "Mt5Account"("organizationId", "login", "serverName");

-- CreateIndex
CREATE UNIQUE INDEX "Mt5CredentialSecretRef_mt5AccountId_key" ON "Mt5CredentialSecretRef"("mt5AccountId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEndpoint_tokenHash_key" ON "WebhookEndpoint"("tokenHash");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_organizationId_mt5AccountId_isActive_idx" ON "WebhookEndpoint"("organizationId", "mt5AccountId", "isActive");

-- CreateIndex
CREATE INDEX "ParserTemplate_organizationId_mt5AccountId_idx" ON "ParserTemplate"("organizationId", "mt5AccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ParserTemplate_organizationId_name_key" ON "ParserTemplate"("organizationId", "name");

-- CreateIndex
CREATE INDEX "SymbolMapping_organizationId_mt5AccountId_idx" ON "SymbolMapping"("organizationId", "mt5AccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SymbolMapping_mt5AccountId_externalSymbol_key" ON "SymbolMapping"("mt5AccountId", "externalSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "SignalEvent_idempotencyKey_key" ON "SignalEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SignalEvent_organizationId_receivedAt_idx" ON "SignalEvent"("organizationId", "receivedAt");

-- CreateIndex
CREATE INDEX "SignalEvent_mt5AccountId_receivedAt_idx" ON "SignalEvent"("mt5AccountId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WindowsNode_nodeAuthTokenHash_key" ON "WindowsNode"("nodeAuthTokenHash");

-- CreateIndex
CREATE INDEX "WindowsNode_status_lastHeartbeatAt_idx" ON "WindowsNode"("status", "lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "NodeHeartbeat_nodeId_createdAt_idx" ON "NodeHeartbeat"("nodeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TerminalInstance_mt5AccountId_key" ON "TerminalInstance"("mt5AccountId");

-- CreateIndex
CREATE INDEX "TerminalInstance_nodeId_status_idx" ON "TerminalInstance"("nodeId", "status");

-- CreateIndex
CREATE INDEX "ExecutionJob_status_availableAt_idx" ON "ExecutionJob"("status", "availableAt");

-- CreateIndex
CREATE INDEX "ExecutionJob_assignedNodeId_status_idx" ON "ExecutionJob"("assignedNodeId", "status");

-- CreateIndex
CREATE INDEX "ExecutionJob_organizationId_mt5AccountId_createdAt_idx" ON "ExecutionJob"("organizationId", "mt5AccountId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionResult_executionJobId_occurredAt_idx" ON "ExecutionResult"("executionJobId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionResult_executionJobId_attemptNumber_key" ON "ExecutionResult"("executionJobId", "attemptNumber");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_tokenHash_key" ON "ApiKey"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_revokedAt_idx" ON "ApiKey"("organizationId", "revokedAt");

-- CreateIndex
CREATE INDEX "SupportImpersonationAudit_organizationId_startedAt_idx" ON "SupportImpersonationAudit"("organizationId", "startedAt");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TotpCredential" ADD CONSTRAINT "TotpCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskProfile" ADD CONSTRAINT "RiskProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mt5Account" ADD CONSTRAINT "Mt5Account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mt5Account" ADD CONSTRAINT "Mt5Account_defaultRiskProfileId_fkey" FOREIGN KEY ("defaultRiskProfileId") REFERENCES "RiskProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mt5Account" ADD CONSTRAINT "Mt5Account_assignedNodeId_fkey" FOREIGN KEY ("assignedNodeId") REFERENCES "WindowsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mt5CredentialSecretRef" ADD CONSTRAINT "Mt5CredentialSecretRef_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "Mt5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "Mt5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_parserTemplateId_fkey" FOREIGN KEY ("parserTemplateId") REFERENCES "ParserTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParserTemplate" ADD CONSTRAINT "ParserTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParserTemplate" ADD CONSTRAINT "ParserTemplate_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "Mt5Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymbolMapping" ADD CONSTRAINT "SymbolMapping_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "Mt5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalEvent" ADD CONSTRAINT "SignalEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalEvent" ADD CONSTRAINT "SignalEvent_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "Mt5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalEvent" ADD CONSTRAINT "SignalEvent_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalEvent" ADD CONSTRAINT "SignalEvent_parserTemplateId_fkey" FOREIGN KEY ("parserTemplateId") REFERENCES "ParserTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeHeartbeat" ADD CONSTRAINT "NodeHeartbeat_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "WindowsNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalInstance" ADD CONSTRAINT "TerminalInstance_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "Mt5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalInstance" ADD CONSTRAINT "TerminalInstance_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "WindowsNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_mt5AccountId_fkey" FOREIGN KEY ("mt5AccountId") REFERENCES "Mt5Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_signalEventId_fkey" FOREIGN KEY ("signalEventId") REFERENCES "SignalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_assignedNodeId_fkey" FOREIGN KEY ("assignedNodeId") REFERENCES "WindowsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_terminalInstanceId_fkey" FOREIGN KEY ("terminalInstanceId") REFERENCES "TerminalInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionResult" ADD CONSTRAINT "ExecutionResult_executionJobId_fkey" FOREIGN KEY ("executionJobId") REFERENCES "ExecutionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportImpersonationAudit" ADD CONSTRAINT "SupportImpersonationAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportImpersonationAudit" ADD CONSTRAINT "SupportImpersonationAudit_supportUserId_fkey" FOREIGN KEY ("supportUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

