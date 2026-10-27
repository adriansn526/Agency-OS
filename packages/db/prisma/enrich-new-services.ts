import { db } from '@repo/db'

const ENRICHMENTS = [
  {
    slug: 'inchideri-terase-sticla',
    seoTitle: 'Închideri Terase cu Sticlă Glisantă: Sisteme Panoramice & Firme',
    seoDescription: 'Soluții complete de închidere terasă cu sticlă securizată glisantă fără rame sau termopan. Vezi ghidul tehnic, avantaje și cere oferte de la firme specializate.',
    intrebari: [
      'Care este diferența între sticla simplă securizată și geamul termopan glisant? | Sticla securizată simplă (8–10 mm) oferă transparență maximă și protecție totală împotriva vântului și ploii, fiind ideală pentru primăvară–toamnă. Pachetul termopan dublu (până la 22 mm) adaugă barieră termică și izolație fonică ridicată, transformând terasa într-un spațiu locuibil tot anul.',
      'Cum se curăță panourile de sticlă pe exterior? | Sistemele de tip cortină (glisante-batante) permit rotirea fiecărui panou la 90 de grade spre interior la capătul șinei, astfel încât ambele fețe ale sticlei se spală ușor și în siguranță direct din interior.',
      'Este necesară autorizație de construire pentru închiderea terasei cu sticlă? | În majoritatea cazurilor, sistemele glisante fără profile verticale sunt considerate închideri demontabile și nepermanente. Totuși, la blocuri sau fațade stradale este recomandată o notificare sau consultarea biroului de urbanism local.'
    ]
  },
  {
    slug: 'inchideri-balcoane-sticla',
    seoTitle: 'Închideri Balcoane cu Sticlă Fără Rame: Ghid & Firme Recomandate',
    seoDescription: 'Transformă-ți balconul într-un spațiu luminos și protejat cu geamuri glisante fără rame. Consultă avantajele, prețurile orientative și cere oferte rapide.',
    intrebari: [
      'De ce să aleg sticlă fără rame în loc de termopan PVC clasic pentru balcon? | Sistemul fără rame nu încarcă structura balconului, nu obturează lumina naturală și păstrează fațada clădirii neschimbată. În plus, vara poți deschide complet balconul, parcând panourile într-o laterală.',
      'Cât de sigure sunt geamurile securizate pentru balcoane la etaje superioare? | Se utilizează sticlă securizată de 8 sau 10 mm grosime, testată la presiuni de vânt de peste 150–200 km/h. În caz extrem de spargere, sticla se granulează în particule mici fără margini tăioase.'
    ]
  },
  {
    slug: 'sticla-ghilotina',
    seoTitle: 'Sticlă Ghilotină Electrică: Pereți Retractabili pentru Terase',
    seoDescription: 'Sisteme motorizate tip ghilotină pentru terase de restaurante, cafenele și vile. Acționare din telecomandă, sticlă termoizolantă și balustradă integrată.',
    intrebari: [
      'Cum funcționează sistemul de sticlă tip ghilotină? | Sistemul este compus din 2 sau 3 foi de sticlă pe ghidaje verticale. Panoul inferior rămâne fix formând o balustradă de protecție, iar panourile superioare coboară sau urcă automat prin acționarea unui motor electric integrat.',
      'Poate fi integrată sticla ghilotină cu sisteme Smart Home? | Da, motoarele pot fi comandate prin telecomandă radio, întrerupător de perete sau integrate în scenarii smart (aplicații pe smartphone, senzori de vânt/ploaie, Alexa, Google Home).'
    ]
  },
  {
    slug: 'pergole-bioclimatice',
    seoTitle: 'Pergole Bioclimatice din Aluminiu: Modele Retractabile & Oferte',
    seoDescription: 'Protecție solară și la intemperii cu pergole bioclimatice automatizate. Află diferențele între lamele rotative și retractabile și solicită oferte de la producători.',
    intrebari: [
      'Ce înseamnă o pergolă bioclimatică? | Lamelele din aluminiu se pot roti între 0° și 135°, reglând fluxul de lumină și ventilația naturală pe timp de vară, iar la închidere etanșează complet acoperișul, apa fiind evacuată prin stâlpi.',
      'Se poate închide o pergolă bioclimatică pe lateral cu sticlă? | Absolut. Combinația ideală pentru 4 sezoane constă într-o pergolă bioclimatică pe acoperiș și sisteme de sticlă glisantă sau ghilotină pe laterale, asigurând protecție termică completă.'
    ]
  },
  {
    slug: 'inchideri-terase-folie',
    seoTitle: 'Închideri Terase cu Folie Transparentă: Capse, Bride & Rulouri',
    seoDescription: 'Ghid și prețuri pentru închiderea terasei cu folie transparentă cristal, capse și bride sau rulouri casetate. Protecție accesibilă pentru sezonul rece.',
    intrebari: [
      'Cât rezistă în timp o folie transparentă cu capse și bride? | O folie cristal transparentă de calitate (0.8 mm grosime tratată UV) are o durată medie de viață de 5–7 ani dacă este întreținută și tensionată corect.',
      'Care este diferența între prelată cu capse și rulou casetat? | Prelata cu capse se montează și se demontează manual buton cu buton. Ruloul casetat rulează pe un tambur protejat într-o casetă superioară din aluminiu, fiind mult mai comod de ridicat prin manivelă sau motor electric.'
    ]
  }
]

async function main() {
  for (const item of ENRICHMENTS) {
    const entry = await db.websiteEntry.findFirst({ where: { slug: item.slug } })
    if (!entry) {
      console.log(`Not found: ${item.slug}`)
      continue
    }

    const currentData = (entry.data ?? {}) as Record<string, unknown>
    const updatedData = {
      ...currentData,
      intrebari: item.intrebari,
    }

    await db.websiteEntry.update({
      where: { id: entry.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
        data: updatedData,
      }
    })
    console.log(`Updated and published: ${item.slug}`)
  }

  // Also update Tentrom Paradise's services array to include these relevant new slugs!
  const tentrom = await db.websiteEntry.findFirst({ where: { slug: 'tentrom-paradise-srl-bucuresti' } })
  if (tentrom) {
    const data = (tentrom.data ?? {}) as Record<string, unknown>
    const currentServices = Array.isArray(data.servicii) ? data.servicii : []
    const newServices = Array.from(new Set([
      ...currentServices,
      'inchideri-terase-sticla',
      'inchideri-balcoane-sticla',
      'sticla-ghilotina',
      'pergole-bioclimatice',
      'inchideri-terase-folie'
    ]))

    await db.websiteEntry.update({
      where: { id: tentrom.id },
      data: {
        data: {
          ...data,
          servicii: newServices
        }
      }
    })
    console.log(`Updated Tentrom Paradise services:`, newServices)
  }
}

main().catch(console.error).finally(() => db.$disconnect())
