import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function testAllocate() {
  const id = "cmpw2gtak0000mb19sdbdl8on"
  
  // Find any package to test with
  const pkg = await db.creditPackageConfig.findFirst()
  if (!pkg) {
    console.log("No package found!")
    return
  }
  
  console.log("Using package:", pkg.id)

  try {
    const updatedInstance = await db.tenantInstance.update({
      where: { id: id },
      data: {
        balanceCredits: { increment: pkg.totalCredits },
      }
    })
    console.log("Updated instance:", updatedInstance)

    const creditPkg = await db.creditPackage.create({
      data: {
        instanceId: updatedInstance.id,
        type: "universal",
        packageName: pkg.name,
        credits: pkg.totalCredits,
        priceEur: pkg.priceEur,
        costEur: 0,
        status: "active"
      }
    })
    console.log("Created credit package:", creditPkg)

  } catch (error: any) {
    console.error("SIMULATED ALLOCATE ERROR:")
    console.error(error.message)
    console.error(error)
  }
}

testAllocate().catch(console.error)
