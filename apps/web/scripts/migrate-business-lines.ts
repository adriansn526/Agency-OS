import { PrismaClient } from "@repo/db";
import { businessLines } from "@repo/mock-data";

const db = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`Starting Business Lines Migration${isDryRun ? " (DRY RUN)" : ""}...`);

  const existingLinesInDb = await db.businessLine.findMany({
    select: { id: true, slug: true, name: true }
  });

  console.log(`Found ${existingLinesInDb.length} existing business lines in DB.`);
  console.log("Mock data contains", businessLines.length, "business lines.");

  console.log("-----------------------------------------");

  const usedDbIds = new Set<string>();

  for (const bl of businessLines) {
    const configPayload = {
      entityTypes: bl.entityTypes,
      projectTemplates: bl.projectTemplates,
      offerTemplates: bl.offerTemplates,
      metrics: bl.metrics,
    };

    // Find if it exists in DB by NAME to preserve ID (avoid breaking Client/Invoice references)
    const existing = existingLinesInDb.find((dbBl) => dbBl.name === bl.name || dbBl.slug === bl.id);

    const payloadId = existing ? existing.id : bl.id;

    console.log(`[UPSERT] ${bl.name}`);
    console.log(`  -> Mapping mock ID '${bl.id}' to DB ID '${payloadId}'`);

    const payload = {
      id: payloadId,
      slug: bl.id, // we use mock id as slug for URLs
      name: bl.name,
      icon: bl.icon,
      color: bl.color,
      isActive: true,
      config: configPayload,
    };

    usedDbIds.add(payloadId);

    if (!isDryRun) {
      await db.businessLine.upsert({
        where: { id: payloadId },
        update: payload,
        create: payload,
      });
      console.log(`  -> Migrated successfully.`);
    } else {
      console.log(`  -> (DRY RUN) Would UPSERT ${payloadId}`);
    }
  }

  // Check for DB lines that were not in mock data (e.g. WertAudit)
  const unknownLines = existingLinesInDb.filter((dbBl) => !usedDbIds.has(dbBl.id));

  if (unknownLines.length > 0) {
    console.log("\n-----------------------------------------");
    console.log(`Found ${unknownLines.length} extra lines in DB that were NOT matched with mock data:`);
    unknownLines.forEach(l => console.log(`  - ${l.id} (${l.name})`));
    console.log("These are kept intact (not deleted).");
  }

  console.log("\nMigration script finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
