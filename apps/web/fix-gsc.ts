import { db } from "@repo/db";

async function main() {
  const eurojobsProject = await db.project.findFirst({
    where: { name: { contains: "Eurojobs" } }
  });

  if (eurojobsProject) {
    const meta = eurojobsProject.metadata as any || {};
    
    // Set both client and project meta to exactly the correct format
    const correctUrl = "sc-domain:tdgresurseumane.ro";

    meta.gscSiteUrl = correctUrl;
    
    await db.project.update({
      where: { id: eurojobsProject.id },
      data: { metadata: meta }
    });
    
    await db.client.update({
      where: { id: eurojobsProject.clientId },
      data: { gscSiteUrl: correctUrl }
    });

    console.log("Updated both Client and Project metadata for GSC URL to:", correctUrl);
  }
}

main().catch(console.error).finally(() => process.exit(0));
