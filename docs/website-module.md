# Modulul Website (Marketing → Website)

Conținut per linie de business (companii, proiecte, articole…) publicat pe un site printr-un API public de tip storefront.
Schema: `packages/db/prisma/sql/website_module.sql` (aplicată manual, aditiv).

## Activare pe o linie
```bash
cd apps/web
npx tsx --env-file=.env.local scripts/website/create-channel.ts <slug-linie> --site-url=https://exemplu.ro --key-label="Frontend"
```
Cheia (`ws_…`) se afișează o singură dată; în baza de date rămâne doar hash-ul SHA-256. Rulat fără `--key-label` doar activează canalul.
Cheile Commerce (`sf_…`) nu funcționează aici și invers.

## API (doar server-la-server, fără CORS)
Toate cererile: `Authorization: Bearer ws_<cheie>`. Cheia stabilește linia; nimic din altă linie nu e vizibil.
Se întoarce doar conținut `published`, din colecții active.

| Endpoint | Răspuns |
|---|---|
| `GET /api/storefront/website/collections` | colecțiile liniei, cu definițiile câmpurilor și numărul de intrări publicate |
| `GET /api/storefront/website/entries?collection=…` | listă paginată. Filtre: `q`, `county`, `city`, `verified=1`, `featured=1`, `sort=featured\|name\|rating\|new`, `page`, `limit` (max 50), `f.<câmp>=<valoare>` doar pentru câmpuri marcate `filterable` |
| `GET /api/storefront/website/entries/<colecție>/<slug>` | detaliu: corp, telefon, website, SEO, media, recenzii aprobate |
| `GET /api/storefront/website/sitemap` | `{ collection, slug, updatedAt }` pentru sitemap |

Erori: 401 (cheie lipsă/greșită/canal dezactivat), 400 (parametri invalizi), 404, 429 (limită `WEBSITE_RATE_LIMIT_PER_MIN`, implicit 1200).

## Pagini SEO de prețuri (colecția `preturi`)

Pagini naționale de preț pe serviciu (`intraconstruct.ro/preturi/<slug>`), alese din analiza de cuvinte cheie din `docs/SEO`. Sunt intrări ale colecției `preturi` (tip `article`); se editează în UI ca orice intrare, fără cod.

- Încărcare primul val (31 de pagini, **draft**): `npx tsx --env-file=.env.local scripts/website/seed-prices.ts --line intraconstruct` (regim de probă) și `--apply`. Idempotent; nu suprascrie intrări existente.
- Câmpuri: `serviciu` (slug de categorie din glosar), `cuvant_cheie`, `cuvinte_cheie`, `preturi` (listă `Lucrare | interval | observații`), `intrebari` (listă `Întrebare | Răspuns`), `preturi_verificate`.
- `body` conține la început marcajul `[DE COMPLETAT]`; frontend-ul nu afișează (404) o pagină care îl mai conține, deci o pagină neterminată nu poate ajunge publică din greșeală. Înlocuiește scheletul, completează listele și publică.
- Lista paginilor: `lib/website/prices/pages.ts`.

### Aranjarea paginilor pe blocuri (servicii și prețuri)

Intrările colecțiilor `preturi` și `servicii` se aranjează din **Intrări → deschide intrarea → „Editează aranjarea”** (editor pe blocuri, ecran complet): adaugi, muți, duplici și ștergi blocuri; câmpurile se generează din catalog. Catalogul și validarea: `lib/website/content/blocks.ts` (același format v2 ca paginile firmelor, alt catalog).

- Blocuri: banner (hero, H1), titlu, text, imagine, galerie foto, carduri, imagine + text, **tabel de prețuri** (citește lista „Prețuri” a intrării), **FAQ** (citește „Întrebări frecvente”; generează schema FAQPage), **zone deservite** (intră în schema Service/areaServed), cerere de ofertă, coloane, secțiune cu fundal. Prețurile și întrebările rămân date, nu text în bloc.
- Imaginile sunt cele încărcate în galeria intrării (secțiunea Imagini); o referință la altă imagine e refuzată.
- Fără niciun bloc, site-ul folosește aranjarea implicită. O pagină cu blocuri nu mai folosește `body`, deci marcajul `[DE COMPLETAT]` din schelet nu o blochează.
- **Salvarea pe o pagină publicată o actualizează pe site** (cache 5 minute); ultimele 20 de versiuni se pot restaura din „Istoric”.
- **Previzualizare:** pentru o ciornă se emite un link privat (`/previzualizare-pagina/<cod>`; intrarea trece în starea „preview”, care nu apare niciodată în API-ul public); un link nou îl invalidează pe cel vechi. Pentru o pagină publicată se dă adresa publică.
- API admin: `GET/PUT /api/website/entries/<id>/content`, `GET/POST …/content/versions`, `POST …/content/preview`. Public (server-la-server): detaliul intrării are `pageLayout` (și lista are `hasBlocks`), plus `GET /api/storefront/website/content-preview/<cod>`.
- **Șabloane de blocuri** (`lib/website/content/templates.ts`): o pagină de preț pornește cu banner → introducere → tabel de prețuri → „De ce depinde prețul” → „Cum alegi firma” → FAQ → zone deservite → cerere de ofertă; o categorie de servicii cu banner → introducere → linkuri către prețurile categoriei → „Cum alegi firma”. Se pun pe paginile fără blocuri cu `npx tsx --env-file=.env.local scripts/website/seed-content-layouts.ts --line intraconstruct [--apply]` (idempotent, nu atinge paginile deja aranjate; completează și FAQ-ul gol al paginilor de preț cu două întrebări generale).
- **Pagina nu apare pe site cât timp un text conține `[DE COMPLETAT]`** (introducerea din șablon); API-ul expune `ready` (fără marcaj în blocuri, sau corp scris când nu sunt blocuri). O categorie de servicii publicată cu blocuri neterminate rămâne pe aranjarea implicită.
- Editorul de intrări ascunde acum câmpurile de firmă (plan, verificat, acces „Profilul meu”, recomandat, locație, contact) pentru colecțiile de tip `article`.

## Date care nu ies niciodată prin API
Emailul de contact, `leadId`, `clientId`, `tenantId`, id-urile de import, recenziile neaprobate și emailul autorilor.
Coloanele noi rămân private până sunt adăugate explicit în `lib/website/storefront/serialize.ts`.

## Teste
```bash
npx tsx --test lib/website/storefront/__tests__/storefront.test.ts
# integrare, DOAR pe o bază temporară cu website_module.sql aplicat (scrie și șterge rânduri):
WEBSITE_TEST_DATABASE_URL=postgresql://…/scratch npx tsx --test lib/website/storefront/__tests__/storefront.integration.test.ts
```
