import { Injectable, UnauthorizedException } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as argon2 from 'argon2';

import { AuthContext } from '../../common/auth/auth.types';
import { PrismaService } from '../../common/prisma.service';
import { CryptoService } from '../../domain/crypto/crypto.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }) {
    const passwordHash = await argon2.hash(input.password);
    const slug = input.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        passwordHash,
        memberships: {
          create: {
            role: 'OWNER',
            organization: {
              create: {
                name: input.organizationName,
                slug: `${slug}-${this.crypto.randomToken(3)}`,
              },
            },
          },
        },
      },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    return this.createSession(user.id, user.email, user.memberships[0]!.organizationId, user.memberships[0]!.role);
  }

  async login(input: { email: string; password?: string; magicToken?: string; totpCode?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        memberships: true,
        totpCredentials: {
          where: {
            disabledAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (input.password) {
      const valid = user.passwordHash ? await argon2.verify(user.passwordHash, input.password) : false;
      if (!valid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    if (input.magicToken) {
      await this.consumeMagicLink(input.email, input.magicToken);
    }

    if (user.totpEnabled) {
      if (!input.totpCode || user.totpCredentials.length === 0) {
        throw new UnauthorizedException('TOTP code required');
      }

      const totp = this.decryptTotp(user.totpCredentials[0]!);
      if (!authenticator.verify({ token: input.totpCode, secret: totp.secret })) {
        throw new UnauthorizedException('Invalid TOTP code');
      }
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('No organization membership');
    }

    return this.createSession(user.id, user.email, membership.organizationId, membership.role);
  }

  async validateSession(token: string, organizationIdHeader?: string): Promise<AuthContext> {
    const sessionHash = this.crypto.hash(token);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: sessionHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          include: {
            memberships: {
              include: { organization: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session expired');
    }

    const membership =
      session.user.memberships.find((candidate) => candidate.organizationId === organizationIdHeader) ??
      session.user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('Membership missing');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      userId: session.user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      sessionId: session.id,
      email: session.user.email,
    };
  }

  async logout(token: string) {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: this.crypto.hash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestMagicLink(email: string, redirectUrl?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const token = this.crypto.randomToken(24);
    await this.prisma.magicLinkToken.create({
      data: {
        userId: user?.id,
        email: email.toLowerCase(),
        tokenHash: this.crypto.hash(token),
        redirectUrl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return {
      delivery: 'outbox',
      token,
    };
  }

  async consumeMagicLink(email: string, token: string) {
    const magicLink = await this.prisma.magicLinkToken.findFirst({
      where: {
        email: email.toLowerCase(),
        tokenHash: this.crypto.hash(token),
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!magicLink) {
      throw new UnauthorizedException('Magic link is invalid or expired');
    }

    await this.prisma.magicLinkToken.update({
      where: { id: magicLink.id },
      data: { consumedAt: new Date() },
    });
  }

  async beginTotpSetup(auth: AuthContext) {
    const secret = authenticator.generateSecret();
    const encrypted = this.crypto.encryptJson({ secret });

    const credential = await this.prisma.totpCredential.create({
      data: {
        userId: auth.userId,
        encryptedSecret: encrypted.cipherText,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });

    return {
      credentialId: credential.id,
      secret,
      otpauthUrl: authenticator.keyuri(auth.email, 'TradeBridge Cloud', secret),
    };
  }

  async verifyTotp(auth: AuthContext, code: string) {
    const credential = await this.prisma.totpCredential.findFirst({
      where: {
        userId: auth.userId,
        disabledAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!credential) {
      throw new UnauthorizedException('TOTP setup not found');
    }

    const secret = this.decryptTotp(credential).secret;
    if (!authenticator.verify({ token: code, secret })) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    await this.prisma.$transaction([
      this.prisma.totpCredential.update({
        where: { id: credential.id },
        data: { verifiedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: auth.userId },
        data: { totpEnabled: true },
      }),
    ]);
  }

  private async createSession(userId: string, email: string, organizationId: string, role: AuthContext['role']) {
    const token = this.crypto.randomToken(32);
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.crypto.hash(token),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        lastSeenAt: new Date(),
      },
    });

    return {
      token,
      session: {
        userId,
        organizationId,
        role,
        requiresTotp: false,
        email,
        sessionId: session.id,
      },
    };
  }

  private decryptTotp(credential: { encryptedSecret: string; iv: string; authTag: string }) {
    return this.crypto.decryptJson<{ secret: string }>({
      cipherText: credential.encryptedSecret,
      iv: credential.iv,
      authTag: credential.authTag,
    });
  }
}
