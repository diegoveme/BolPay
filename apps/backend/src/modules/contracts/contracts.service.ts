import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement contracts domain logic against this.prisma
}
