import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // 1. Get Fudly BL
  const bls = await db.businessLine.findMany()
  console.log('Business Lines:', bls.map(b => `${b.slug} (${b.id})`).join(', '))
  
  const fudly = bls.find(b => b.slug === 'fudly')
  if (!fudly) {
    console.log('Fudly BL not found!')
    return
  }
  console.log(`\nFudly ID: ${fudly.id}`)

  // Count existing
  const existingSegs = await db.marketingSegment.count({ where: { businessLineId: fudly.id } })
  const existingTmpl = await db.marketingTemplate.count({ where: { businessLineId: fudly.id } })
  console.log(`Existing: ${existingSegs} segments, ${existingTmpl} templates`)

  // 2. Create Segments for Fudly
  const segments = [
    {
      name: "Restaurante fără site web",
      description: "Restaurante, bistro-uri și cafenele care nu au prezență online — potențial maxim pentru serviciile Fudly de meniu digital și comenzi online.",
      filters: [
        { field: "industry", operator: "in", value: ["restaurant", "bistro", "cafenea", "pizzerie", "fast-food"] },
        { field: "website", operator: "is_empty" }
      ]
    },
    {
      name: "HoReCa București",
      description: "Toate unitățile HoReCa din București — segment premium pentru upsell meniu digital + livrare.",
      filters: [
        { field: "industry", operator: "in", value: ["restaurant", "hotel", "catering", "bar", "pub"] },
        { field: "county", operator: "eq", value: "București" }
      ]
    },
    {
      name: "Fast-food & Delivery",
      description: "Restaurante fast-food și delivery-only — target principal pentru integrare comenzi online Fudly.",
      filters: [
        { field: "industry", operator: "in", value: ["fast-food", "delivery", "pizzerie"] }
      ]
    },
    {
      name: "Restaurante cu +50 angajați",
      description: "Lanțuri / restaurante mari cu potențial de contract enterprise Fudly cu volum mare.",
      filters: [
        { field: "industry", operator: "in", value: ["restaurant", "hotel", "catering"] },
        { field: "employees", operator: "gte", value: 50 }
      ]
    },
    {
      name: "Cafenele & Patiserii",
      description: "Segment nișă cafenele și patiserii —ideal pentru meniu digital QR și pre-order.",
      filters: [
        { field: "industry", operator: "in", value: ["cafenea", "patiserie", "cofetarie"] }
      ]
    },
  ]

  for (const seg of segments) {
    const existing = await db.marketingSegment.findFirst({ 
      where: { businessLineId: fudly.id, name: seg.name } 
    })
    if (existing) {
      console.log(`  ⏭ Segment exists: ${seg.name}`)
      continue
    }
    await db.marketingSegment.create({
      data: {
        businessLineId: fudly.id,
        name: seg.name,
        description: seg.description,
        filters: seg.filters,
        contactCount: 0,
      }
    })
    console.log(`  ✅ Created segment: ${seg.name}`)
  }

  // 3. Create Templates for Fudly
  const templates = [
    {
      name: "Intro Meniu Digital – SMS",
      channel: "sms",
      body: "Buna ziua, {{contactPerson}}! 🍽️ Fudly ofera meniu digital QR GRATUIT pt restaurantul dvs. Clientii comanda direct de pe telefon. Detalii: {{link}} Raspundeti STOP pt dezabonare.",
      variables: ["contactPerson", "link"],
    },
    {
      name: "Promo Comenzi Online – SMS",
      channel: "sms",
      body: "{{companyName}}, activati comenzi online in 24h! 📱 Fudly: meniu digital + livrare integrata. 0 comision prima luna. Info: {{link}}",
      variables: ["companyName", "link"],
    },
    {
      name: "Follow-up Restaurant – SMS",
      channel: "sms",
      body: "{{contactPerson}}, ati vazut oferta Fudly? 🎯 Peste 200 restaurante folosesc deja meniul digital. Demo gratuit: {{link}}",
      variables: ["contactPerson", "link"],
    },
    {
      name: "Invitație Demo Fudly – Email",
      channel: "email",
      subject: "{{companyName}} — Meniu digital gratuit de la Fudly 🍽️",
      body: `Bună ziua {{contactPerson}},

Mă numesc Adrian și reprezint Fudly — platforma #1 de meniu digital și comenzi online pentru restaurante din România.

Am observat că {{companyName}} nu are încă un meniu digital sau sistem de comenzi online. Fudly vă poate ajuta cu:

✅ Meniu digital cu QR code — clienții scanează și comandă
✅ Comenzi online integrate — pick-up sau delivery
✅ Dashboard analytics — vezi ce se vinde cel mai bine
✅ 0 comision prima lună

Peste 200 de restaurante din România folosesc deja Fudly.

Aș vrea să vă ofer o demonstrație gratuită de 15 minute. Când vă este convenabil?

Cu stimă,
Adrian | Fudly
📞 0740 XXX XXX
🌐 fudly.ro`,
      variables: ["contactPerson", "companyName"],
    },
    {
      name: "Ofertă Enterprise Fudly – Email",
      channel: "email",
      subject: "Parteneriat Fudly pentru {{companyName}} — ofertă personalizată",
      body: `Stimate {{contactPerson}},

Felicitări pentru succesul {{companyName}}! 

Pentru unitățile HoReCa cu volum mare, Fudly oferă un pachet Enterprise care include:

🏢 Multi-locație — un singur dashboard pentru toate punctele de lucru
📊 Analytics avansat — trend-uri, peak hours, top produse
🔗 Integrare POS — sincronizare automată cu sistemul de casă
👨‍🍳 Kitchen Display System — comenzile ajung direct în bucătărie
💰 Pricing personalizat — negociem în funcție de volum

Propun o întâlnire de 30 minute pentru a discuta nevoile specifice ale {{companyName}}.

Cu respect,
Echipa Fudly Enterprise`,
      variables: ["contactPerson", "companyName"],
    },
  ]

  for (const tmpl of templates) {
    const existing = await db.marketingTemplate.findFirst({
      where: { businessLineId: fudly.id, name: tmpl.name }
    })
    if (existing) {
      console.log(`  ⏭ Template exists: ${tmpl.name}`)
      continue
    }
    await db.marketingTemplate.create({
      data: {
        businessLineId: fudly.id,
        name: tmpl.name,
        channel: tmpl.channel,
        subject: tmpl.subject || null,
        body: tmpl.body,
        variables: tmpl.variables,
      }
    })
    console.log(`  ✅ Created template: ${tmpl.name}`)
  }

  // Final counts
  const finalSegs = await db.marketingSegment.count({ where: { businessLineId: fudly.id } })
  const finalTmpl = await db.marketingTemplate.count({ where: { businessLineId: fudly.id } })
  console.log(`\n✅ Final: ${finalSegs} segments, ${finalTmpl} templates for Fudly`)
}

main().catch(console.error).finally(() => db.$disconnect())
