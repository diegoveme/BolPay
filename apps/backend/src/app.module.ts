import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ContractsModule,
    MilestonesModule,
    EscrowModule,
    DisputesModule,
    PayrollModule,
    NotificationsModule,
    ActivityLogsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
