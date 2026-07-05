import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around PrismaClient wired into the Nest lifecycle so the
 * connection opens on boot and closes gracefully on shutdown.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /** Open the database connection on boot. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Close the database connection on shutdown. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
