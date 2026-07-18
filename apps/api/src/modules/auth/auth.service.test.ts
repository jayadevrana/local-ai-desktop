import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    magicLinkToken: {
      create: vi.fn(),
    },
    session: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const crypto = {
    hash: vi.fn((value: string) => `hash:${value}`),
    randomToken: vi.fn(() => 'token-123'),
    encryptJson: vi.fn(),
    decryptJson: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('issues a magic link token and stores only the hashed token', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.magicLinkToken.create.mockResolvedValue({ id: 'magic-1' });

    const service = new AuthService(prisma as never, crypto as never);
    const result = await service.requestMagicLink('Owner@Example.com', 'https://app.example.com/login');

    expect(result).toEqual({
      delivery: 'outbox',
      token: 'token-123',
    });
    expect(prisma.magicLinkToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        email: 'owner@example.com',
        tokenHash: 'hash:token-123',
        redirectUrl: 'https://app.example.com/login',
      }),
    });
  });

  it('prefers the requested organization membership during session validation', async () => {
    prisma.session.findFirst.mockResolvedValue({
      id: 'session-1',
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        memberships: [
          { organizationId: 'org-a', role: 'VIEWER' },
          { organizationId: 'org-b', role: 'OWNER' },
        ],
      },
    });
    prisma.session.update.mockResolvedValue({ id: 'session-1' });

    const service = new AuthService(prisma as never, crypto as never);
    const auth = await service.validateSession('session-token', 'org-b');

    expect(auth).toEqual({
      userId: 'user-1',
      organizationId: 'org-b',
      role: 'OWNER',
      sessionId: 'session-1',
      email: 'owner@example.com',
    });
    expect(prisma.session.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          refreshTokenHash: 'hash:session-token',
        }),
      }),
    );
  });
});
