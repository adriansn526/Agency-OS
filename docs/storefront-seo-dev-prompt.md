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
- POST /orders (existent; nu-l modifica).
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

## Constrângeri
- Nu schimba contractul /orders și nu apela API-ul din browser (cheia e doar pe server).
- Nu hardcoda URL-uri de poze și nu deduce SKU din slug decât unde o face deja codul existent.
- Dacă vezi în API ceva care te blochează (câmp lipsă, format), spune-mi exact ce îți trebuie; ERP-ul poate adăuga câmpuri, dar nu schimbă cele existente.

## La final raportează
Ce ai găsit în codul existent, ce ai schimbat (fișiere), exemple concrete (HTML-ul `<head>` și JSON-LD-ul pentru 2 produse reale, un exemplu cu poză și unul fără), URL-ul sitemap-ului, rezultatul Rich Results Test, și ce a rămas de decis.
```
