import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Fetching client tentromparadise.ro@gmail.com...")
  
  // Find the client
  let client = await prisma.client.findFirst({
    where: { OR: [{ email: 'tentromparadise.ro@gmail.com' }, { companyName: { contains: 'Tentrom' } }] }
  })
  
  if (!client) {
    console.log("Client not found, creating...")
    client = await prisma.client.create({
      data: {
        companyName: 'Tentrom Paradise',
        email: 'tentromparadise.ro@gmail.com',
        status: 'active'
      }
    })
  }
  
  console.log("Client ID:", client.id)

  // Find business line
  let bl = await prisma.businessLine.findFirst()
  if (!bl) {
    console.log("No business line found, creating generic one...")
    bl = await prisma.businessLine.create({
      data: {
        name: 'Web Dev Division',
        slug: 'web-dev'
      }
    })
  }

  // Create or update project
  const project = await prisma.project.upsert({
    where: { 
      // Upsert by a unique field if available, or just create if we can't upsert easily.
      // Since we don't have a unique constraint on name+clientId, we'll just check if it exists first.
      id: 'dummy' // we'll use findFirst instead
    },
    update: {},
    create: {
      name: 'Platformă Web - Închideri Terase',
      clientId: client.id,
      businessLineId: bl.id,
      templateId: 'dev_template', // Required by our WebDev dashboard config
      status: 'in_lucru',
      progress: 25,
      notes: 'Proiect generat automat cu noul Dashboard Web Dev.\nDezvoltare platformă de prezentare premium.',
      metadata: {
        pipelineStage: 'design',
        stagingUrl: 'https://staging.tentromparadise.ro',
        figmaUrl: 'https://figma.com/file/tentrom',
        githubUrl: 'https://github.com/tentrom/web',
        lighthouse: {
          performance: 85,
          accessibility: 90,
          bestPractices: 95,
          seo: 100,
          updatedAt: new Date().toISOString()
        },
        checklist: [
          { item: 'Dezvoltare arhitectură performantă pe framework Next.js', done: true },
          { item: 'Implementare UI/UX Premium cu Showcase-uri vizuale', done: true },
          { item: 'Dezvoltare Calculatoare Dinamice de Ofertă', done: false },
          { item: 'Integrare selector vizual de texturi și materiale', done: false }
        ]
      }
    }
  }).catch(async (e) => {
    // Upsert failed because id doesn't match, let's just create it directly
    const existing = await prisma.project.findFirst({
      where: { name: 'Platformă Web - Închideri Terase' }
    })
    
    if (existing) {
       console.log("Project already exists. Updating it to dev_template...")
       return prisma.project.update({
         where: { id: existing.id },
         data: {
           templateId: 'dev_template',
           businessLineId: bl.id,
           metadata: {
             ...((existing.metadata as any) || {}),
             pipelineStage: 'design',
             stagingUrl: 'https://staging.tentromparadise.ro',
             lighthouse: {
               performance: 85,
               accessibility: 90,
               bestPractices: 95,
               seo: 100,
               updatedAt: new Date().toISOString()
             }
           }
         }
       })
    } else {
       console.log("Creating new project...")
       return prisma.project.create({
         data: {
           name: 'Platformă Web - Închideri Terase',
           clientId: client.id,
           businessLineId: bl.id,
           templateId: 'dev_template',
           status: 'in_lucru',
           progress: 25,
           notes: 'Proiect generat automat cu noul Dashboard Web Dev.',
           metadata: {
             pipelineStage: 'design',
             stagingUrl: 'https://staging.tentromparadise.ro',
             figmaUrl: 'https://figma.com/file/tentrom',
             githubUrl: 'https://github.com/tentrom/web',
             lighthouse: {
               performance: 85,
               accessibility: 90,
               bestPractices: 95,
               seo: 100,
               updatedAt: new Date().toISOString()
             },
             checklist: [
               { item: 'Dezvoltare arhitectură performantă pe framework Next.js', done: true },
               { item: 'Implementare UI/UX Premium', done: true },
               { item: 'Dezvoltare Calculatoare', done: false },
               { item: 'Selector materiale', done: false }
             ]
           }
         }
       })
    }
  })
  
  console.log("Project processed!", project.id)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
