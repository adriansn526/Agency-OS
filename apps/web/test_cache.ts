import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  const project = await prisma.project.findFirst()
  if (!project) return console.log('no project')
  
  const metadata = (project.metadata || {}) as any
  console.log("wpSeoCache keys:", Object.keys(metadata.wpSeoCache || {}))
  
  if (Object.keys(metadata.wpSeoCache || {}).length > 0) {
    const firstKey = Object.keys(metadata.wpSeoCache)[0]
    console.log("First cached item:", metadata.wpSeoCache[firstKey])
  }
}

test().catch(console.error)
