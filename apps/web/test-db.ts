import { db } from "@repo/db";

async function main() {
  const eurojobsProject = await db.project.findFirst({
    where: { name: { contains: "Eurojobs" } },
    include: { client: true }
  });
  console.log("Project Meta:", JSON.stringify(eurojobsProject?.metadata, null, 2));
  console.log("Client:", JSON.stringify(eurojobsProject?.client, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
