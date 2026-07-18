import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      cookies?: Record<string, string>;
      headers: Record<string, string | undefined>;
      auth?: unknown;
    }>();

    const token = request.cookies?.tb_session ?? request.headers['x-session-token'];
    if (!token) {
      throw new UnauthorizedException('Missing session token');
    }

    request.auth = await this.authService.validateSession(token, request.headers['x-organization-id']);
    return true;
  }
}
