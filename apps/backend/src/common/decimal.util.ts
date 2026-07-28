import { Prisma } from '@prisma/client';

/** Sum the `amount` of each item, returning a Prisma.Decimal (0 when empty). */
export function sumAmounts(
  items: { amount: Prisma.Decimal }[],
): Prisma.Decimal {
  return items.reduce(
    (sum, item) => sum.add(item.amount),
    new Prisma.Decimal(0),
  );
}
