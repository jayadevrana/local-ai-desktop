import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  loginSchema,
  registerSchema,
  requestMagicLinkSchema,
  totpVerifySchema,
} from '@tradebridge/types';

import { CurrentAuth } from '../../common/decorators/current-auth.decorator';
import type { AuthContext } from '../../common/auth/auth.types';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { ZodValidationPipe } from '../../common/security/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: { email: string; password: string; fullName: string; organizationName: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(body);
    response.cookie('tb_session', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });
    return result.session;
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: { email: string; password?: string; magicToken?: string; totpCode?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body);
    response.cookie('tb_session', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });
    return result.session;
  }

  @Post('magic-link/request')
  requestMagicLink(
    @Body(new ZodValidationPipe(requestMagicLinkSchema)) body: { email: string; redirectUrl?: string },
  ) {
    return this.authService.requestMagicLink(body.email, body.redirectUrl);
  }

  @Post('magic-link/consume')
  async consumeMagicLink(
    @Body() body: { email: string; magicToken: string; totpCode?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login({
      email: body.email,
      magicToken: body.magicToken,
      totpCode: body.totpCode,
    });
    response.cookie('tb_session', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });
    return result.session;
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  me(@CurrentAuth() auth: AuthContext) {
    return auth;
  }

  @UseGuards(SessionAuthGuard)
  @Post('logout')
  async logout(
    @Req() request: { cookies?: Record<string, string> },
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.cookies?.tb_session) {
      await this.authService.logout(request.cookies.tb_session);
    }
    response.clearCookie('tb_session');
    return { ok: true };
  }

  @UseGuards(SessionAuthGuard)
  @Post('totp/setup')
  setupTotp(@CurrentAuth() auth: AuthContext) {
    return this.authService.beginTotpSetup(auth);
  }

  @UseGuards(SessionAuthGuard)
  @Post('totp/verify')
  async verifyTotp(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(totpVerifySchema)) body: { code: string },
  ) {
    await this.authService.verifyTotp(auth, body.code);
    return { ok: true };
  }
}
