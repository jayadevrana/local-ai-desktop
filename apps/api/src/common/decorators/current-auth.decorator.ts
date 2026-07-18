import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthContext } from '../auth/auth.types';

export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const request = ctx.switchToHttp().getRequest<{ auth: AuthContext }>();
  return request.auth;
});
