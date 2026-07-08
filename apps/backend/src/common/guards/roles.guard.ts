import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../types/auth';

/**
 * Global authorization guard. Enforces @Roles() metadata.
 *
 * Administrators are supervisors, not operators: they may READ any resource
 * (safe GET requests bypass the role check so they can oversee the whole
 * platform), but they must NOT perform the operational writes reserved for the
 * acting roles (creating contracts, running payroll, etc.). Their own write
 * powers (suspend/rehabilitate, invite) list 'administrator' in @Roles
 * explicitly, so they pass through the normal check below.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; method: string }>();
    const user = request.user;
    if (!user) return false;
    if (user.role === 'administrator' && request.method === 'GET') return true;
    if (required.includes(user.role)) return true;
    throw new ForbiddenException(
      `Requires role: ${required.join(' | ')} (you are ${user.role})`,
    );
  }
}
