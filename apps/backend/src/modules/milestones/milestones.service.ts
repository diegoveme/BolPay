import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement milestones domain logic against this.prisma
}
