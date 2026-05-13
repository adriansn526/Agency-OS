import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin2026!ASNS', 12);
  const user = await prisma.user.upsert({
    where: { email: 'adrian@asns.ro' },
    update: { password: hash, role: 'admin' },
    create: {
      name: 'Adrian Nichitov',
      email: 'adrian@asns.ro',
      password: hash,
      role: 'admin',
    },
  });
  console.log('✅ Admin user created/updated:', user.email, '| Role:', user.role);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
