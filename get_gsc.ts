import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  // Let's see if there is a GSCDaily table or similar in prisma schema
}
main().catch(console.error).finally(() => prisma.$disconnect())
