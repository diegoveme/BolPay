import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EscrowService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement escrow domain logic against this.prisma
}
