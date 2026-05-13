// ============================================================
// ASNS Agency OS — Contract Templates (SEO & Ads)
// ============================================================

import type { ContractTemplate } from './types'

export const contractTemplates: ContractTemplate[] = [
  {
    id: 'ct-seo-ads',
    name: 'Contract Servicii Marketing Digital (SEO & Ads)',
    description: 'Contract cadru pentru servicii de optimizare SEO și/sau management campanii Google Ads',
    serviceTypes: ['seo', 'ads', 'seo+ads'],
    sections: [
      // ── ART. 1 — PĂRȚILE CONTRACTANTE ──
      {
        id: 'art-1',
        title: 'Art. 1 — Părțile Contractante',
        editable: true,
        content: `1.1. **{{company_legal_name}}**, cu sediul în {{company_address}}, înregistrată la Registrul Comerțului sub nr. {{company_reg_com}}, CIF {{company_cif}}, cont IBAN {{company_iban}} deschis la {{company_bank}}, reprezentată legal prin {{company_representative}} — {{company_representative_role}}, în calitate de **PRESTATOR**,

și

1.2. **{{client_legal_name}}**, cu sediul în {{client_address}}, înregistrată la Registrul Comerțului sub nr. {{client_reg_com}}, CIF {{client_cif}}, reprezentată legal prin {{client_representative_prefix}} {{client_representative}}, în calitate de {{client_representative_role}}, denumit(ă) în continuare **BENEFICIAR**,

au convenit încheierea prezentului contract de prestări servicii, în următoarele condiții:`
      },

      // ── ART. 2 — OBIECTUL CONTRACTULUI ──
      {
        id: 'art-2',
        title: 'Art. 2 — Obiectul Contractului',
        editable: true,
        content: `2.1. Obiectul prezentului contract îl constituie prestarea de către Prestator a serviciilor de marketing digital, după cum urmează:

{{#if_seo}}
**A) Servicii de Optimizare pentru Motoare de Căutare (SEO):**
a) Realizarea unui audit tehnic SEO complet al website-ului Beneficiarului;
b) Cercetare și analiză de cuvinte cheie relevante pentru domeniul de activitate al Beneficiarului;
c) Optimizare On-Page: structură URL-uri, meta tag-uri (title, description), heading-uri, imagini, link-uri interne, viteza de încărcare;
d) Optimizare Off-Page: strategie de link building, guest posting, citări locale (NAP);
e) Optimizare tehnică: indexare, crawlability, sitemap XML, robots.txt, date structurate (Schema.org);
f) Strategie de conținut: recomandări pentru articole de blog, pagini de servicii, landing pages;
g) Monitorizare poziții cuvinte cheie și raportare lunară;
h) Acces și configurare Google Search Console și Google Analytics 4.
{{/if_seo}}

{{#if_ads}}
**{{ads_label}}) Servicii de Management Campanii Google Ads (PPC):**
a) Crearea și configurarea contului Google Ads al Beneficiarului (dacă acesta nu există);
b) Cercetare cuvinte cheie pentru campanii PPC, inclusiv cuvinte cheie negative;
c) Creare și optimizare campanii: Search, Display, Performance Max, Video (după caz);
d) Redactare și testare A/B a textelor publicitare (ad copy);
e) Configurare conversii și tracking (Google Tag Manager, GA4);
f) Optimizare continuă: ajustare bidding, audiențe, plasamente, programare;
g) Administrare buget publicitar și realocare în funcție de performanță;
h) Raportare lunară detaliată cu KPI-uri: CTR, CPC, CPA, ROAS, conversii.
{{/if_ads}}

2.2. Detaliile tehnice, livrabilele specifice și KPI-urile agreate sunt cuprinse în **Oferta nr. {{offer_number}}** din data de {{offer_date}}, care face parte integrantă din prezentul contract.

2.3. Prestatorul va respecta în permanență bunele practici recunoscute în industrie (White Hat SEO) și politicile platformelor utilizate (Google Ads Policies).`
      },

      // ── ART. 3 — DURATA CONTRACTULUI ──
      {
        id: 'art-3',
        title: 'Art. 3 — Durata Contractului',
        editable: true,
        content: `3.1. Prezentul contract se încheie pe o perioadă de **{{duration}} luni**, începând cu data de **{{start_date}}** și până la data de **{{end_date}}**.

3.2. Contractul se prelungește automat (reconducere tacită) cu perioade succesive de câte {{duration}} luni, dacă niciuna din părți nu notifică celeilalte părți intenția de a nu prelungi contractul, cu cel puțin **{{notice_period}} de zile** înainte de expirarea perioadei contractuale sau a oricărei prelungiri.

3.3. Serviciile SEO necesită în mod obișnuit o perioadă de minimum 4-6 luni pentru obținerea unor rezultate vizibile. Beneficiarul confirmă că a fost informat cu privire la acest aspect.`
      },

      // ── ART. 4 — PREȚUL ȘI MODALITĂȚI DE PLATĂ ──
      {
        id: 'art-4',
        title: 'Art. 4 — Prețul și Modalități de Plată',
        editable: true,
        content: `4.1. Pentru serviciile prevăzute la Art. 2, Beneficiarul va plăti Prestatorului:

{{#if_monthly}}
**a) Tarif lunar de management:** {{monthly_price}} {{currency}} + TVA / lună
{{/if_monthly}}
{{#if_fixed}}
**b) Tarif fix (one-time):** {{fixed_price}} {{currency}} + TVA
{{/if_fixed}}
{{#if_setup}}
**c) Tarif de setup inițial:** {{setup_fee}} {{currency}} + TVA (plătibil în prima lună)
{{/if_setup}}
{{#if_discount}}
**d) Discount aplicat:** {{discount_value}} (conform ofertei {{offer_number}})
{{/if_discount}}

4.2. Plata se efectuează în baza facturii emise de Prestator, în termen de **{{payment_term}} zile** de la data emiterii facturii, prin transfer bancar în contul specificat la Art. 1.1.

4.3. Facturarea se realizează lunar, la începutul fiecărei luni calendaristice, pentru serviciile aferente lunii respective.

4.4. În cazul întârzierii la plată, Beneficiarul datorează penalități de **{{penalty_rate}}% pe zi de întârziere**, calculate de la data scadenței până la data plății efective, fără a fi necesară punerea în întârziere.

{{#if_ads}}
4.5. **Bugetul de media (publicitar)** alocat platformei Google Ads este **separat** de tarifele de management prevăzute mai sus. Beneficiarul va finanța direct contul Google Ads sau va transfera bugetul agreat către Prestator, care îl va administra exclusiv în contul Google Ads al Beneficiarului. Prestatorul nu este responsabil pentru costurile percepute de platforma Google.
{{/if_ads}}`
      },

      // ── ART. 5 — OBLIGAȚIILE PRESTATORULUI ──
      {
        id: 'art-5',
        title: 'Art. 5 — Obligațiile Prestatorului',
        editable: true,
        content: `5.1. Prestatorul se obligă să:

a) Presteze serviciile prevăzute la Art. 2 cu profesionalism, diligență și în conformitate cu bunele practici din industrie;
b) Utilizeze exclusiv tehnici de optimizare și publicitate conforme cu regulile Google (White Hat SEO, politicile Google Ads);
c) Transmită Beneficiarului un raport lunar detaliat privind activitățile realizate și rezultatele obținute, până la data de 10 a lunii următoare;
d) Informeze Beneficiarul cu promptitudine despre orice probleme tehnice identificate pe website-ul acestuia care pot afecta performanța campaniilor;
e) Protejeze informațiile confidențiale ale Beneficiarului, conform Art. 8;

{{#if_seo}}
f) Nu garanteze poziții specifice în rezultatele motoarelor de căutare, având în vedere că algoritmii sunt controlați de terți (Google);
g) Informeze Beneficiarul despre orice modificare majoră a algoritmilor Google care poate afecta pozițiile website-ului;
{{/if_seo}}

{{#if_ads}}
f) Administreze bugetul publicitar cu responsabilitate și să oprească campaniile în caz de anomalii detectate;
g) Asigure accesul Beneficiarului la contul Google Ads în orice moment;
{{/if_ads}}

h) Respecte termenele de livrare convenite.`
      },

      // ── ART. 6 — OBLIGAȚIILE BENEFICIARULUI ──
      {
        id: 'art-6',
        title: 'Art. 6 — Obligațiile Beneficiarului',
        editable: true,
        content: `6.1. Beneficiarul se obligă să:

a) Achite la termen toate sumele datorate conform Art. 4;
b) Furnizeze Prestatorului, în termen de 5 zile lucrătoare de la semnarea contractului, toate accesurile necesare: panou administrare website (CMS), Google Analytics 4, Google Search Console, Google Tag Manager, Google Business Profile;
c) Furnizeze informațiile, materialele (texte, imagini, documente) solicitate de Prestator pentru buna desfășurare a serviciilor, în termen rezonabil;
d) Să nu modifice, fără o consultare prealabilă cu Prestatorul, structura tehnică a website-ului, conținutul paginilor optimizate sau configurările conturilor Google;
e) Să nu angajeze un terț pentru servicii similare pe același website/cont fără notificarea Prestatorului;

{{#if_ads}}
f) Să finanțeze la timp bugetul publicitar agreat pentru contul Google Ads;
g) Să garanteze că materialele publicitare (texte, imagini, oferte) furnizate respectă legislația în vigoare și nu încalcă drepturi de proprietate intelectuală ale terților;
{{/if_ads}}

h) Să numească o persoană de contact responsabilă pentru comunicarea cu Prestatorul.`
      },

      // ── ART. 7 — LIMITAREA RĂSPUNDERII ──
      {
        id: 'art-7',
        title: 'Art. 7 — Limitarea Răspunderii',
        editable: true,
        content: `7.1. Prestatorul nu garantează obținerea unor rezultate specifice (poziții în motoarele de căutare, volum de trafic, număr de conversii, cost per conversie) deoarece performanța depinde de factori externi necontrolabili (algoritmii Google, comportamentul competitorilor, sezonalitate, calitatea produselor/serviciilor Beneficiarului).

7.2. Prestatorul nu este responsabil pentru:
a) Scăderi ale traficului sau pozițiilor cauzate de actualizările algoritmilor Google;
b) Pierderi cauzate de modificări neautorizate efectuate de Beneficiar sau terți pe website;
c) Perioadele în care website-ul Beneficiarului este inaccesibil din motive care nu țin de Prestator (hosting, domeniu, erori de server);
d) Conținutul publicat de Beneficiar pe website-ul propriu;

{{#if_ads}}
e) Suspendarea contului Google Ads de către Google din motive care țin de Beneficiar (nerespectarea politicilor Google, produs interzis etc.);
f) Performanța landing page-urilor în ceea ce privește rata de conversie, dacă Prestatorul nu administrează și website-ul;
g) Costurile de media percepute de platforma Google;
{{/if_ads}}

7.3. Răspunderea totală a Prestatorului, în orice caz, este limitată la valoarea onorariilor efectiv plătite de Beneficiar în ultimele 3 luni.`
      },

      // ── ART. 8 — CONFIDENȚIALITATE ──
      {
        id: 'art-8',
        title: 'Art. 8 — Confidențialitate',
        editable: false,
        content: `8.1. Ambele Părți se obligă să păstreze confidențialitatea tuturor informațiilor comerciale, tehnice, financiare și strategice obținute în derularea prezentului contract.

8.2. Obligația de confidențialitate se extinde și asupra accesurilor la platforme, conturilor, parolelor și datelor analitice partajate între Părți.

8.3. Această obligație supraviețuiește încetării contractului pe o perioadă de **2 (doi) ani**.

8.4. Nu constituie încălcarea obligației de confidențialitate divulgarea de informații:
a) Care erau deja de domeniu public la momentul divulgării;
b) A căror divulgare este impusă prin lege sau prin hotărâre judecătorească;
c) Care au fost comunicate cu acordul scris prealabil al celeilalte Părți.`
      },

      // ── ART. 9 — PROPRIETATE INTELECTUALĂ ──
      {
        id: 'art-9',
        title: 'Art. 9 — Proprietate Intelectuală și Proprietatea Conturilor',
        editable: true,
        content: `9.1. Conținutul creat de Prestator (texte SEO, articole, meta descriptions, texte publicitare) în executarea prezentului contract devine proprietatea Beneficiarului după achitarea integrală a facturilor aferente.

9.2. Strategiile, metodologiile, tool-urile și know-how-ul intern al Prestatorului rămân proprietatea exclusivă a acestuia.

9.3. Toate conturile platformelor utilizate (Google Analytics 4, Google Search Console, Google Tag Manager, Google Business Profile, Google Ads) **aparțin Beneficiarului**. Prestatorul va primi drepturi de acces/administrare pe durata contractului, care vor fi revocate la încetarea colaborării.

9.4. La încetarea contractului, Prestatorul va asigura transferul complet al accesurilor și documentației tehnice către Beneficiar sau către un terț desemnat de acesta, într-un termen de 15 zile lucrătoare.`
      },

      // ── ART. 10 — FORȚA MAJORĂ ──
      {
        id: 'art-10',
        title: 'Art. 10 — Forța Majoră',
        editable: false,
        content: `10.1. Forța majoră exonerează de răspundere Partea care o invocă, în conformitate cu prevederile Codului Civil.

10.2. Partea care invocă forța majoră este obligată să notifice celeilalte Părți, în termen de 5 zile de la apariția evenimentului, existența acestuia, precum și să facă dovada forței majore prin acte emise de autoritățile competente.

10.3. Dacă situația de forță majoră durează mai mult de 60 de zile, oricare dintre Părți poate solicita rezilierea contractului, fără plata de daune-interese.`
      },

      // ── ART. 11 — REZILIEREA CONTRACTULUI ──
      {
        id: 'art-11',
        title: 'Art. 11 — Rezilierea Contractului',
        editable: true,
        content: `11.1. Prezentul contract poate fi reziliat:

a) **Prin acordul scris al ambelor Părți**, la orice moment;
b) **Unilateral**, de către oricare dintre Părți, cu un preaviz scris de **{{notice_period}} de zile**, transmis prin email la adresele menționate la Art. 1;
c) **De drept**, fără punere în întârziere și fără intervenția instanței, în următoarele cazuri:
   - Neplata facturilor de către Beneficiar mai mult de 30 de zile de la scadență;
   - Încălcarea gravă a obligațiilor contractuale de către oricare dintre Părți;
   - Deschiderea procedurii de insolvență împotriva oricăreia dintre Părți.

11.2. În caz de reziliere, Beneficiarul datorează plata serviciilor prestate până la data încetării contractului, inclusiv penalitățile de întârziere, dacă este cazul.

11.3. Rezilierea nu afectează drepturile și obligațiile acumulate anterior datei rezilierii.`
      },

      // ── ART. 12 — DISPOZIȚII FINALE ──
      {
        id: 'art-12',
        title: 'Art. 12 — Dispoziții Finale',
        editable: false,
        content: `12.1. Prezentul contract reprezintă voința concordantă a Părților și înlocuiește orice altă înțelegere anterioară, scrisă sau verbală, referitoare la obiectul acestuia.

12.2. Orice modificare a prezentului contract se va face numai prin acte adiționale semnate de ambele Părți.

12.3. Comunicările între Părți se vor face în scris, prin email, la adresele menționate la Art. 1, și se consideră recepționate la data confirmării de primire.

12.4. Prezentul contract este guvernat de legislația din România. Orice litigiu decurgând din sau în legătură cu prezentul contract va fi soluționat pe cale amiabilă, iar în caz de eșec, de către instanțele judecătorești competente de la sediul Prestatorului.

12.5. Anexe care fac parte integrantă din prezentul contract:
- **Anexa 1**: Oferta comercială nr. {{offer_number}} din data de {{offer_date}}
- **Anexa 2**: Lista serviciilor detaliate și livrabilele agreate`
      },
    ],
  },
]
