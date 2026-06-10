import {
  Injectable,
  NotFoundException,
  type MessageEvent,
} from '@nestjs/common';
import type { Notification, Prisma } from '@prisma/client';
import { Observable, Subject, filter, map } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotificationEvent {
  userId: string;
  notification: Notification;
}

/**
 * Persists notifications and pushes them in real time to connected clients
 * via Server-Sent Events (docs/proyecto_overview.md §7).
 */
@Injectable()
export class NotificationsService {
  private readonly events$ = new Subject<NotificationEvent>();

  constructor(private readonly prisma: PrismaService) {}

  /** Create a notification and emit it to the user's live stream. */
  async notify(
    userId: string,
    type: string,
    message: string,
    data?: Prisma.InputJsonValue,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: { userId, type, message, data },
    });
    this.events$.next({ userId, notification });
    return notification;
  }

  /** Live SSE stream scoped to one user. */
  stream(userId: string): Observable<MessageEvent> {
    return this.events$.pipe(
      filter((event) => event.userId === userId),
      map((event) => ({ data: event.notification })),
    );
  }

  list(userId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(id: string, userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    if (count === 0) throw new NotFoundException('Notification not found');
    return { id, read: true };
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
