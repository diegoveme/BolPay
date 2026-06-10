import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PollarService } from './pollar.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PollarService],
  exports: [AuthService, PollarService],
})
export class AuthModule {}
