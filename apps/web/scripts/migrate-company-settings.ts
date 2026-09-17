import { PrismaClient } from "@repo/db";
import fs from "fs";
import path from "path";

const db = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`Starting Company Settings Migration${isDryRun ? " (DRY RUN)" : ""}...`);

  // We assume a single tenant for this platform
  const tenantId = "default-tenant";

  // Read settings.json
  const settingsPath = path.resolve(process.cwd(), ".data/settings.json");
  if (!fs.existsSync(settingsPath)) {
    console.error("settings.json not found at", settingsPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(settingsPath, "utf-8");
  const settingsJson = JSON.parse(rawData);

  const company = settingsJson.company || {};
  const contracts = settingsJson.contracts || {};
  const integrations = settingsJson.integrations || {};

  const payload = {
    tenantId,
    name: company.name || "N/A",
    legalName: company.legalName || "N/A",
    regCom: company.regCom || "N/A",
    cif: company.cif || "N/A",
    address: company.address || "N/A",
    iban: company.iban || null,
    bank: company.bank || null,
    representative: company.representative || null,
    representativeRole: company.representativeRole || null,
    email: company.email || null,
    phone: company.phone || null,
    website: company.website || null,
    contractsConfig: contracts,
    integrationsConfig: integrations,
  };

  console.log("Will execute the following operation on DB:");
  console.log("-----------------------------------------");
  console.log("UPSERT CompanySettings");
  console.log("Where: tenantId =", tenantId);
  console.log("Create/Update Payload:", JSON.stringify(payload, null, 2));
  console.log("-----------------------------------------");

  if (isDryRun) {
    console.log("DRY RUN completed. No changes made.");
  } else {
    const result = await db.companySettings.upsert({
      where: { tenantId },
      update: payload,
      create: payload,
    });
    console.log("SUCCESS! Company Settings migrated.");
    console.log(`ID: ${result.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
