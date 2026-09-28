import { PrismaClient } from './packages/db/src/index';

const db = new PrismaClient();
async function run() {
  const users = await db.user.findMany({ select: { id: true, email: true, name: true } });
  console.log('AGENCY OS USERS:', users);
}
run();
