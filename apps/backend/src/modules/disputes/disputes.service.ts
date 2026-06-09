import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement disputes domain logic against this.prisma
}
