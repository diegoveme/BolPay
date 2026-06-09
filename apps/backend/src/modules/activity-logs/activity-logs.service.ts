import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement activity-logs domain logic against this.prisma
}
