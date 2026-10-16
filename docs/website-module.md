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

## Date care nu ies niciodată prin API
Emailul de contact, `leadId`, `clientId`, `tenantId`, id-urile de import, recenziile neaprobate și emailul autorilor.
Coloanele noi rămân private până sunt adăugate explicit în `lib/website/storefront/serialize.ts`.

## Teste
```bash
npx tsx --test lib/website/storefront/__tests__/storefront.test.ts
# integrare, DOAR pe o bază temporară cu website_module.sql aplicat (scrie și șterge rânduri):
WEBSITE_TEST_DATABASE_URL=postgresql://…/scratch npx tsx --test lib/website/storefront/__tests__/storefront.integration.test.ts
```
