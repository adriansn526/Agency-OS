const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();

const templates = {
  seo_project: {
    phases: [
      {name:'Audit tehnic SEO',status:'pending'},
      {name:'Keyword research',status:'pending'},
      {name:'Optimizare On-Page',status:'pending'},
      {name:'Content creation',status:'pending'},
      {name:'Link building',status:'pending'},
      {name:'Monitorizare & raportare',status:'pending'}
    ],
    checklist: [
      {item:'Audit tehnic complet',done:false},
      {item:'Configurare Google Search Console',done:false},
      {item:'Configurare GA4',done:false},
      {item:'Keyword mapping finalizat',done:false},
      {item:'Meta titles & descriptions optimizate',done:false},
      {item:'Schema markup implementat',done:false},
      {item:'Sitemap XML generat',done:false},
      {item:'Robots.txt configurat',done:false},
      {item:'Core Web Vitals verificate',done:false},
      {item:'Raport lunar configurat',done:false}
    ],
    kpis: [
      {label:'Organic Traffic',value:'—',target:'—'},
      {label:'Keyword Top 3',value:'—',target:'—'},
      {label:'Keyword Top 10',value:'—',target:'—'},
      {label:'Domain Authority',value:'—',target:'—'}
    ]
  },
  ads_campaign: {
    phases: [
      {name:'Setup cont & tracking',status:'pending'},
      {name:'Structură campanii',status:'pending'},
      {name:'Creare ad copies',status:'pending'},
      {name:'Lansare campanii',status:'pending'},
      {name:'Optimizare CPC/CPA',status:'pending'},
      {name:'Scalare & raportare',status:'pending'}
    ],
    checklist: [
      {item:'Google Ads account configurat',done:true},
      {item:'Conversion tracking instalat',done:false},
      {item:'Google Tag Manager configurat',done:false},
      {item:'Campanii create',done:true},
      {item:'Ad copies aprobate',done:false},
      {item:'Negative keywords adăugate',done:false},
      {item:'Bid strategy setată',done:false},
      {item:'Remarketing configurat',done:false},
      {item:'Raport lunar configurat',done:false}
    ],
    kpis: [
      {label:'Spend lunar',value:'—',target:'—'},
      {label:'Conversii',value:'—',target:'—'},
      {label:'ROAS',value:'—',target:'—'},
      {label:'CPC mediu',value:'—',target:'—'}
    ]
  }
};

async function main() {
  const projects = await db.project.findMany();
  for (const p of projects) {
    const t = templates[p.templateId];
    if (!t) {
      console.log('⏭️', p.name, '→ no template for', p.templateId);
      continue;
    }
    const meta = p.metadata || {};
    if (!meta.phases || meta.phases.length === 0) {
      const updated = { ...meta, ...t };
      await db.project.update({ where: { id: p.id }, data: { metadata: updated } });
      console.log('✅', p.name, '→ populated with', p.templateId, 'template');
    } else {
      console.log('⏭️', p.name, '→ already has metadata');
    }
  }
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
