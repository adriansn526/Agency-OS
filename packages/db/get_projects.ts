import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const p = await prisma.project.findMany({ where: { name: { contains: 'inchideriterase' } } })
  console.log(JSON.stringify(p.map(x => ({id: x.id, name: x.name, annotations: x.metadata?.annotations})), null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
