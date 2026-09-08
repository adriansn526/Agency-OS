import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clientId = "cmnta3s9y0001cufuxtgnvv1q";

  // Get SEO Project details
  const project = await prisma.project.findFirst({
    where: { 
      clientId: clientId,
      name: { contains: 'SEO' }
    }
  });

  if (!project) {
    console.log("Nu am gasit proiectul SEO.");
    return;
  }

  console.log("Nume:", project.name);
  console.log("Notes:", project.notes);
  
  if (project.metadata && typeof project.metadata === 'object' && 'sources' in project.metadata) {
    const md = project.metadata as any;
    console.log(`\nSurse monitorizate (${md.sources?.length || 0}):`);
    md.sources?.forEach((s: any) => {
        console.log(`- [${s.category}] ${s.name} (${s.url}) - Status: ${s.status}`);
    });
  } else {
    console.log("Metadata (JSON):", JSON.stringify(project.metadata, null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
