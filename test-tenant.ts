import { db } from "./packages/db/index.ts"

async function main() {
  const t = await db.tenantInstance.findUnique({
    where: { id: "cmpw2gtak0000mb19sdbdl8on" }
  })
  console.log("TenantInstance:", t)
}

main().catch(console.error)
