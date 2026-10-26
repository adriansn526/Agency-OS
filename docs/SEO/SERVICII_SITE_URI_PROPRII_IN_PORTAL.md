# Serviciile site-urilor proprii în IntraConstruct: ce există, ce adăugăm (26.10.2026)

Întrebare: pentru toate serviciile pe care le oferă site-urile tale, facem pagini în portal sau le adăugăm în lista de servicii dacă nu există?

Răspuns: **ambele, dar fiecare serviciu într-un singur loc:** categoria din glosar (pagina `/lucrari/<categorie>`) pentru serviciul în sine, iar pagina de preț (`/preturi/<slug>`) doar acolo unde există căutări reale de preț. Nu am creat o pagină de preț pentru fiecare variantă (multe au sub 20 de căutări pe lună).

Surse: paginile și categoriile publice ale celor 6 site-uri WordPress (API-ul lor public; inchideriterase.ro nu expune API, deci pentru el am folosit Search Console), interogările din Search Console și Google Keyword Planner (România, 26.10.2026). Centruldemobila.ro (mobilă) nu intră: nu e construcții.

## 1. Serviciile fiecărui site și unde sunt în portal

| Site | Serviciu | Categorie în glosar | Pagină de preț |
|---|---|---|---|
| **hidropro.ro** | Hidroizolații (beci, fundație, terasă, baie, membrană bituminoasă) | `hidroizolatii` (există) | `hidroizolatie` (există) + **`hidroizolatie-terasa`** (nouă) |
| | Membrană EPDM | `hidroizolatii` | **`membrana-epdm`** (nouă) |
| | Pardoseli epoxidice, rășină, texturi 3D | `pardoseli-placari` (există) | `pardoseala-epoxidica` (există; „rășină epoxidică pardoseală pret” 210 intră pe aceeași pagină) |
| **inchideriterase.ro** | Închideri de terase (sticlă, folie, rulouri, prelate), balcoane | **`terase-pergole-foisoare`** (nouă) | **`inchidere-terasa`** (nouă) |
| | Foișoare, pergole, copertine | **`terase-pergole-foisoare`** | **`pergole-si-foisoare`** (nouă) |
| | Gard metalic, panouri | `garduri-pavaje` (există) | `gard` (există) |
| **tigladeacoperis.ro** | Țiglă ceramică și metalică, olane | `acoperisuri` (există) | `manopera-acoperis` (există). Prețul țiglei ca produs nu are pagină: căutările (țiglă ceramică 720) sunt de cumpărare, nu de lucrare |
| **tubovent.ro** | Ventilație industrială, exhaustare, desfumare, tubulatură | **`ventilatie-industriala`** (nouă) | Fără pagină de preț (volume 0–30 pe lună) |
| | Montaj hote | `climatizare` (există) | Fără pagină de preț (40) |
| | Jgheaburi și burlane (tinichigerie) | `acoperisuri` | **`jgheaburi-si-burlane`** (nouă) |
| | Izolații coș de fum și țevi | `instalatii-termice` și `izolatii-termice` (există) | Fără pagină de preț: Keyword Planner nu arată volum, deși Search Console arată ~240 de afișări pe lună pentru „izolație coș de fum”. Se acoperă cu un ghid, nu cu o pagină de preț |
| **tomaswoods.ro** | Reconditionare uși, ferestre, scări din lemn | `tamplarie-dulgherie` (există) | **`tamplarie-lemn`** (nouă) |
| **ferestrelemnstratificat.ro** | Ferestre din lemn stratificat | `tamplarie-dulgherie` / `geamuri` (există) | Se acoperă în `tamplarie-lemn` (40 de căutări) |

**Rezultat:** 2 categorii noi și 6 pagini de preț noi; restul serviciilor aveau deja loc.

## 2. De ce aceste adăugiri (Keyword Planner, căutări pe lună)

- **Terase, pergole, foișoare:** cuvintele de bază însumează ~20.000 de căutări (pergolă 8.100, foișor 6.600, copertină 2.900, închidere terasă 2.400), plus închidere balcon 720 și terasă închisă 590. Cu „preț”: închidere terasă cu folie 590, pergolă 90 + 90, foișor lemn 70. E singura categorie care nu avea deloc loc în glosar și are volum real.
- **Jgheaburi și burlane:** jgheaburi 1.000, burlane 720, tinichigerie 880 (bid până la 12,3 RON). Cu „preț” și „montaj”: 220.
- **Hidroizolație terasă și EPDM:** terasă circulabilă 140, membrană EPDM 140, membrană bituminoasă 50, hidroizolație acoperiș 30.
- **Tâmplărie din lemn:** reconditionare uși lemn 140, scări interioare lemn 70, ferestre lemn stratificat 40.
- **Ventilație industrială:** doar 30 de căutări („ventilație industrială”). Categoria există pentru ca firmele din domeniu (tubovent, firme de ventilație pentru ERP) să poată fi listate, nu pentru trafic.

## 3. Ce NU am făcut și de ce
- **Pagini de preț pentru fiecare variantă** (de exemplu „hidroizolație piscină”, „hidroizolație beci”: 10 căutări fiecare). Sunt acoperite de paginile mari.
- **Pagină de preț pentru țiglă ca produs** (720). E intenție de cumpărare; clientul ar pleca la un magazin, nu cere o ofertă de lucrare.
- **Coșuri de fum:** Keyword Planner arată 0, dar Search Console arată cerere (tubovent are ~240 de afișări pe lună pe „izolație coș fum”). Merită un ghid după ce vezi cât trafic aduce.
- Volumele sunt estimări Google, rotunjite; sub 10 înseamnă „foarte puțin”, nu neapărat zero.

## 4. Cum se aplică (în ordine, toate rămân draft)

```bash
cd apps/web
npx tsx --env-file=.env.local scripts/website/seed-services.ts --line intraconstruct --apply       # 2 categorii noi
npx tsx --env-file=.env.local scripts/website/seed-prices.ts --line intraconstruct --apply         # 6 pagini de preț noi
npx tsx --env-file=.env.local scripts/website/seed-content-layouts.ts --line intraconstruct --apply # șabloane de blocuri
```

Fiecare script rulează întâi fără `--apply`, ca simulare (am rulat simulările pe baza reală: 2 categorii și 6 pagini de creat, nimic scris). Paginile devin vizibile doar după ce echipa scrie introducerea (marcajul „[DE COMPLETAT]”) și le publică.

## 5. Legătura cu linkurile din site-uri
Paginile noi sunt ținte pentru **servicii complementare** din `PLAN_LINKURI_SERVICII_COMPLEMENTARE.md`, dar atenție la regula ta: un site nu trimite spre portal cititori pentru **același serviciu** pe care îl oferă. De exemplu, `inchidere-terasa` este țintă pentru tubovent sau tomaswoods, **nu** pentru inchideriterase.ro.
