const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  const campaign = await db.marketingCampaign.findUnique({
    where: { id: 'cmost3uot013dcuwh9hv0o8ur' },
    include: { 
      segment: true, 
      template: { select: { name: true, channel: true } },
      businessLine: { select: { slug: true } },
      _count: { select: { campaignLeads: true } }
    }
  });
  
  if (!campaign) { console.log('Campaign not found!'); return; }
  
  console.log('Campaign:', campaign.name);
  console.log('Status:', campaign.status);
  console.log('Channel:', campaign.channel);
  console.log('Business Line:', campaign.businessLine?.slug);
  console.log('Segment:', campaign.segment?.name);
  console.log('Template:', campaign.template?.name);
  console.log('CampaignLeads count:', campaign._count.campaignLeads);
  console.log('SegmentId:', campaign.segmentId);
  console.log('TemplateId:', campaign.templateId);
  
  if (campaign._count.campaignLeads > 0) {
    const leads = await db.campaignLead.findMany({
      where: { campaignId: campaign.id },
      include: { lead: { select: { companyName: true, phone: true } } }
    });
    leads.forEach(cl => console.log(' Lead:', cl.lead.companyName, cl.lead.phone, '| Status:', cl.status, '| Code:', cl.uniqueCode));
  }
  
  await db.$disconnect();
}
run().catch(e => { console.error(e.message); process.exit(1); });
