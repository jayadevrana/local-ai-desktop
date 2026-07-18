import { SetMetadata } from '@nestjs/common';
import { organizationRoles } from '@tradebridge/types';

export type OrganizationRole = (typeof organizationRoles)[number];

export const ROLES_KEY = 'roles';
export const Roles = (...roles: OrganizationRole[]) => SetMetadata(ROLES_KEY, roles);
