import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Automatic audit trail of platform events. Recording never throws: a failed
 * log must not break the business operation.
 */
@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Persist an audit entry for a user action; swallows errors by design. */
  async record(
    userId: string,
    event: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: { userId, event, metadata },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record activity "${event}": ${String(error)}`,
      );
    }
  }

  /** List a single user's most recent audit entries. */
  listForUser(userId: string) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Platform-wide feed (administrators). */
  listAll() {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { id: true, email: true, role: true } } },
    });
  }
}
