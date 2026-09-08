import { db } from "./packages/db/index.ts"

async function main() {
  const pkgs = await db.creditPackageConfig.findMany()
  console.log("Packages:", pkgs)
}
main()
