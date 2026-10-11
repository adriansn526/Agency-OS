# Prompt pentru dezvoltatorul storefront-ului (ecaroseria.ro): SEO și indexare

Copiază blocul de mai jos ca prompt.

```
Context: ecaroseria.ro (Next.js, repo separat) este un magazin NOU de piese auto, încă NEINDEXAT în Google. Catalogul vine din Agency OS (ERP) prin API-ul `/api/storefront/*`. ERP-ul a pregătit acum datele SEO; storefront-ul trebuie să le folosească corect ÎNAINTE de prima indexare. Începe prin a citi codul storefront-ului (pagini de produs/listare/categorie/vehicul, layout, sitemap/robots dacă există, cum construiește URL-urile pozelor) și spune-mi ce ai găsit înainte să modifici ceva mare.

## API (verificat pe producție; auth: `Authorization: Bearer <cheia storefront>`, doar server-side)
Baza: https://admin.asns.ro/api/storefront
- GET /products?page&pageSize(max 60)&make&model&gen&category&side&quality&q&sort(relevance|price_asc|price_desc|name)
  → { page, pageSize, total, pages, vehicle, category, items:[{ slug, sku, name, oe, side, brand, quality, image, category:{slug,name}, priceRon, compareAtRon, bulky, availability }] }
  page > 500 → 400 (protecție). Pentru tot catalogul folosește /sitemap, nu paginarea.
- GET /products/{slug} → aceleași câmpuri + images[] (URL-uri CDN https, prima = principala), seoTitle, seoDescription, attributes, oeCodes[], fitments[{make,model,generation{slug,name,variant,yearFrom,yearTo}}], related[]. Produs inexistent/dezactivat → 404.
- GET /sitemap?cursor&limit(≤5000) → { items:[{ slug, updatedAt }], nextCursor|null }  (keyset; buclează până nextCursor=null; ~110.700 produse)
- GET /vehicles → mărci; GET /vehicles?make=<slug> → modele cu generații; GET /categories → arbore cu număr de produse; GET /search?q= ; GET /meta → { currency:"RON", vatIncluded:true, priceUpdatedAt, fxRate, fxRateDate }
- POST /orders (existent; nu-l modifica; a primit în plus, aditiv, `service` pe linie, vezi secțiunea „Servicii partenere”).
- GET /service-partners?service=mount|paint|paint_mount&bulky=small|standard|large|xlarge&lat=&lng=&county=&city=&limit=3&maxKm=150 → { mode:"distance"|"area"|"all", total, items:[{ id, name, city, county, address, distanceKm, services:[{ service, priceRon, leadTimeDays }] }] }  (parteneri activi, cei mai apropiați primii; priceRon include TVA).
Rate limit: 1200 cereri/minut per cheie (429 + Retry-After).

## Reguli despre date
1. Prețul `priceRon` e în RON, TVA INCLUS (vezi /meta.vatIncluded). Se actualizează zilnic (curs BNR + feed furnizor): nu-l cache-ui mai mult de câteva minute/ISR scurt, sau revalidare la cerere.
2. `availability`: "confirm_on_order" (disponibil la furnizor, confirmăm telefonic — valoarea aproape tuturor produselor), "out_of_stock", "in_stock" (rezervat stocului propriu, încă nefolosit). Arată în pagină text coerent cu schema.org (ex. „Disponibil la comandă, confirmăm stocul telefonic”).
3. Pozele: folosește DOAR `image` / `images[]` din API (URL CDN complet). Elimină orice logică din storefront care deduce poza din SKU. Produs fără poză → `image:null`, `images:[]` (placeholder, și vezi punctul noindex de mai jos).
4. `slug` este OPAC: nu-l construi, nu-l parsa, nu-l salva în afara URL-ului. Slugurile se vor schimba în curând (din `uuid-SKU` în `titlu-citibil-SKU`; sufixul `-SKU` rămâne ultimul segment). Când vom schimba, API-ul va accepta și slugul vechi și va întoarce în răspuns `slug`-ul canonic. Implementează de pe acum: dacă `slug`-ul din răspuns ≠ slugul cerut în URL → redirect 301 către URL-ul canonic.
5. Nu apela detaliul pentru toate cele 110.000 de produse la build. Folosește generare la cerere + cache/ISR (dynamicParams), nu SSG complet.

## Ce trebuie implementat (în ordine de prioritate)
A. Meta pe pagina de produs: `<title>` = `seoTitle` (≤70 car., deja construit de ERP: piesă + parte + marcă + model + an); `<meta name="description">` = `seoDescription`; H1 = `name` (sau seoTitle, alege și spune-mi); `<link rel="canonical">` către URL-ul canonic absolut (https, fără parametri); Open Graph/Twitter cu `image` principală.
B. JSON-LD pe pagina de produs: `Product` cu name, image[], sku, mpn (= oe), brand (dacă există), description, `offers` { price (= priceRon), priceCurrency "RON", availability (confirm_on_order → https://schema.org/BackOrder sau LimitedAvailability — spune-mi ce alegi și de ce; out_of_stock → OutOfStock), url, seller }, plus `BreadcrumbList` (Acasă › categorie › produs). Nu inventa rating/reviews. Validează cu Rich Results Test.
C. sitemap.xml + robots.txt: sitemap index cu fișiere de maximum 50.000 URL-uri (avem ~110k), construit din /sitemap (cursor), `lastmod` = `updatedAt`; include și paginile de categorie/vehicul. robots.txt cu linia `Sitemap:`; blochează /cos, /checkout, /cont, rezultatele de căutare internă și variantele cu parametri (?sort=, ?page= peste 1 cu canonical corect). Cache pe sitemap (nu 23 de apeluri la fiecare cerere).
D. Indexare etapizată: `<meta name="robots" content="noindex,follow">` pe produsele fără poză (`image:null`) și pe orice produs cu `seoTitle` gol; restul index. Spune-mi dacă ai nevoie ca ERP-ul să adauge în /sitemap un câmp `hasImage` (modificare aditivă, o fac eu).
E. Pagini de listare indexabile pe vehicul și categorie: /{marcă}/{model}/{generație} și /categorie/{slug} cu H1, text scurt unic, titlu „{Piesă/Categorie} {Marcă} {Model} {ani} | eCaroseria”, canonical, paginare cu URL-uri curate. Folosește /vehicles, /categories și filtrele make/model/gen din /products. Evită conținut duplicat (sortări/filtre → canonical la pagina de bază).
F. Performanță: imagini cu width/height sau aspect-ratio fix, loading="lazy" sub fold, fără CLS; LCP pe poza principală cu priority; HTML server-rendered (nu client-only) pentru produs, listare și meta.
G. Search Console: verificare domeniu, trimitere sitemap-uri, și un checklist de după lansare (acoperire, canonical alese de Google, Core Web Vitals).

## Servicii partenere (vopsire / montaj) — NOU, deja în producție
Clientul poate cere ca piesa cumpărată să fie vopsită la culoarea mașinii și/sau montată de un service partener. Piesa se livrează **la service**, nu la client. Sunt 4 parteneri activi (București) cu tarife de test, care se vor schimba, deci nu hardcoda prețuri.

Tipuri de serviciu: `mount` (montaj), `paint` (vopsire la culoarea mașinii), `paint_mount` (vopsire + montaj). Nu toți partenerii fac toate tipurile: afișează doar ce întoarce API-ul pentru partenerul și piesa respectivă.

Flux în storefront:
1. Pe pagina de produs, după „Adaugă în coș”, oferă „Vopsire / Montaj la service”. Recomandare (de confirmat cu proprietarul): arată vopsirea doar pentru produse grunduite (`attributes.primed` true) și montajul pentru piese de caroserie și iluminat.
2. Cere locația clientului (geolocație din browser sau județ/oraș introdus; pentru o adresă poți folosi `GET /api/storefront/geocode`) și apelează `GET /service-partners` cu `service`, `bulky` și `lat`/`lng` sau `county`/`city`. Afișează partenerii cu nume, oraș, distanță, preț și termen (`leadTimeDays` zile).
3. Dacă `mode` = "area" sau "all", nu ai coordonate: afișează lista fără distanță. Dacă `items` e gol: spune „Momentan nu avem service partener în zona ta” și lasă comanda fără serviciu.
4. Pentru vopsire (`paint`, `paint_mount`) cere **codul de vopsea** al mașinii (obligatoriu, litere/cifre/spații, max. 40 de caractere; arată un exemplu și unde se găsește pe mașină). VIN-ul e opțional (17 caractere, fără I, O, Q).
5. Trimite la comandă, pe linia piesei: `items:[{ slug, quantity:1, service:{ partnerId, type, paintCode?, vin? } }]`.

Reguli stricte (ERP-ul le impune și întoarce 422 cu mesaj în română):
- O linie cu serviciu are `quantity: 1`; pentru două piese cu serviciu trimiți **două linii**.
- Toate serviciile unei comenzi folosesc **același** partener (cel din `/service-partners`). Dacă clientul vrea servicii la doi parteneri, cere comenzi separate.
- **Prețul serviciului nu se trimite niciodată**; ERP-ul îl ia din tariful partenerului pentru clasa de mărime a piesei. Prețul din `GET /service-partners` este orientativ: **suma afișată în confirmare este cea din răspunsul 201** (`servicesTotalRon`, `productsTotalRon`, `totalRon`). Produsul întoarce doar `bulky: true/false`; trimite `bulky=large` când e true și `standard` când e false pentru estimare (pentru piese foarte mici sau foarte mari prețul final poate diferi).
- Cu serviciu, piesa merge la service: formularul de adresă rămâne **adresa clientului** (contact/facturare), iar în pagina de confirmare scrie clar „Piesa se livrează la <service>, <adresă>”.
- Un produs `out_of_stock` este refuzat (422); scoate-l din coș sau cere ofertă.

Răspuns 201: `{ id, number, totalRon, productsTotalRon, servicesTotalRon }`. Afișează numărul comenzii, defalcarea (produse + servicii) și textul „Te contactăm telefonic pentru confirmare. Piesele vopsite nu se pot returna.” (confirmă formularea juridică cu proprietarul).

Erori de tratat (afișează `error` ca atare): „Service-ul ales nu mai este disponibil. Te rugăm să alegi altul.” (reapelezi `/service-partners`), „Serviciul ales nu este disponibil pentru produsul de pe linia N…”, „Pentru vopsire trebuie să introduci codul de vopsea al mașinii.”, „Seria de șasiu (VIN) trebuie să aibă 17 caractere.”, „Serviciile dintr-o comandă trebuie făcute la același service partener.”.

Plata rămâne **ramburs** pentru tot totalul (piese + servicii). Nu există plată online. Cache: `/service-partners` se poate ține 1–5 minute; nu cache-ui răspunsul la `/orders`. Folosește `Idempotency-Key` ca la orice comandă.

## Constrângeri
- Nu modifica restul contractului /orders (câmpul `service` e aditiv) și nu apela API-ul din browser (cheia e doar pe server).
- Nu hardcoda URL-uri de poze și nu deduce SKU din slug decât unde o face deja codul existent.
- Dacă vezi în API ceva care te blochează (câmp lipsă, format), spune-mi exact ce îți trebuie; ERP-ul poate adăuga câmpuri, dar nu schimbă cele existente.

## La final raportează
Ce ai găsit în codul existent, ce ai schimbat (fișiere), exemple concrete (HTML-ul `<head>` și JSON-LD-ul pentru 2 produse reale, un exemplu cu poză și unul fără), URL-ul sitemap-ului, rezultatul Rich Results Test, și ce a rămas de decis.
```
