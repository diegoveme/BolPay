import type { UserRole } from '@prisma/client';

/** Claims embedded in the BolPay access token. */
export interface JwtPayload {
  /** User id (UUID). */
  sub: string;
  email: string;
  role: UserRole;
}

/** Shape attached to `request.user` by the JwtAuthGuard. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
