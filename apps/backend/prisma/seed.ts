import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Minimal development seed. Expand as the domain grows.
 * Run with: bun run db:seed  (from apps/backend)
 */
async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bolpay.local' },
    update: {},
    create: {
      email: 'admin@bolpay.local',
      // Dev-only placeholder; replace with a real hash from the Auth module.
      passwordHash: 'CHANGE_ME',
      role: UserRole.administrator,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seeded admin user:', admin.email);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
