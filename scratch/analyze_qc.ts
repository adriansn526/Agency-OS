import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: { 
      OR: [
        { companyName: { contains: 'QualityControl', mode: 'insensitive' } },
        { email: { contains: 'qualitycontrol', mode: 'insensitive' } },
        { website: { contains: 'qualitycontrol', mode: 'insensitive' } }
      ]
    },
    include: {
      _count: {
        select: {
          projects: true,
          offers: true,
          contracts: true,
          invoices: true,
          activities: true,
          communications: true
        }
      },
      businessLine: {
        select: { name: true }
      }
    }
  });

  if (clients.length === 0) {
    console.log("Nu am gasit niciun client 'QualityControl'");
    return;
  }

  for (const client of clients) {
    console.log("Client:");
    console.log("ID:", client.id);
    console.log("Nume Companie:", client.companyName);
    console.log("Email:", client.email);
    console.log("Telefon:", client.phone);
    console.log("Website:", client.website);
    console.log("Status:", client.status);
    console.log("Industrie:", client.industry);
    console.log("BusinessLine:", client.businessLine.name);
    console.log("Stats:", JSON.stringify(client._count, null, 2));

    const projects = await prisma.project.findMany({
      where: { clientId: client.id },
      select: { name: true, status: true, progress: true, budget: true }
    });
    if (projects.length > 0) {
      console.log("\nProjects:");
      console.table(projects);
    }

    const offers = await prisma.offer.findMany({
      where: { clientId: client.id },
      select: { number: true, templateName: true, status: true, value: true, currency: true }
    });
    if (offers.length > 0) {
      console.log("\nOffers:");
      console.table(offers);
    }
    
    const communications = await prisma.communication.findMany({
      where: { clientId: client.id },
      select: { channel: true, direction: true, subject: true, date: true }
    });
    if (communications.length > 0) {
      console.log("\nCommunications:");
      console.table(communications);
    }
    console.log("--------------------------------------------------");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
