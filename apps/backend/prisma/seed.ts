import { AuthProvider, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Minimal development seed. Creates the platform administrator (admins can
 * only be created by invitation afterwards). Run with: bun run db:seed
 */
async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bolpay.local' },
    update: {},
    create: {
      email: 'admin@bolpay.local',
      name: 'BolPay Admin',
      role: UserRole.administrator,
      authProvider: AuthProvider.email,
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
