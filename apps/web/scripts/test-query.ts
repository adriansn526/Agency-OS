import { db } from '@repo/db'

async function main() {
  const id = 'cmnzkierz0005cuxtll925rnk'
  try {
    const project = await db.project.findUnique({
      where: { id },
      include: {
        businessLine: { select: { slug: true, name: true, icon: true, color: true } },
        client: { select: { id: true, companyName: true, contactPerson: true, email: true, googleAdsCustomerId: true, ga4PropertyId: true, gscSiteUrl: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
    console.log(JSON.stringify(project, null, 2))
  } catch(e) {
    console.error('Error fetching:', e)
  }
}
main()
