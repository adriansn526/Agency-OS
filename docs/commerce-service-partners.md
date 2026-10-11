# Service-uri partenere (vopsire / montaj) — registru, prospectare Google, coordonate

Pagină admin: `/commerce/partners`. Storefront: `GET /api/storefront/service-partners` (vezi comentariul din rută).

## Flux
1. **Căutare Google** (Places API New, `GOOGLE_MAPS_API_KEY`, doar server): „tinichigerie vopsitorie București”. Google nu spune ce servicii face un service: „vopsitorie”/„tinichigerie” se deduc din denumire, restul se verifică telefonic.
2. **Salvare ca lead-uri** (CRM: `entityType=service_partners`, `status=prospect`, `source=google_places`, `externalId=Place ID`). Nu apar în registru și nu ajung la clienți.
3. **Confirmare** (telefon): doar valorile confirmate intră în registru, plus Place ID și linkul Maps. Rating și recenzii rămân în lead.
4. **Tarife și activare** în registru. Un partener activ are nevoie de locație și cel puțin un tarif activ.

Costuri: fiecare pagină de 20 de rezultate = 1 cerere facturată. Plafon zilnic `GOOGLE_PLACES_MAX_REQUESTS_PER_DAY` (implicit 100), max 3 pagini/căutare, jurnal în `CommerceServicePartnerSearch`.

## Coordonate (pentru sortarea pe distanță)
| Sursă | Reguli |
|---|---|
| `google` | Din Places; se pot păstra cel mult **30 de zile**. Se reîmprospătează prin Place ID (Place Details, doar câmpul `location`) după 20 de zile; la 30 de zile fără reîmprospătare se șterg. |
| `osm` | Geocodare cu OpenStreetMap Nominatim pe adresa confirmată (rezervă: fără Place ID, Place negăsit sau coordonate Google expirate). Nu expiră. © OpenStreetMap contributors (ODbL). Politică Nominatim: User-Agent propriu (`NOMINATIM_USER_AGENT`), max 1 cerere/secundă. |
| `manual` | Introduse de o persoană; nu expiră și nu se ating. |

Endpoint-ul de storefront ignoră coordonatele Google mai vechi de 30 de zile chiar dacă jobul nu a rulat. Un partener fără coordonate valide rămâne disponibil pe județ/oraș.

Reîmprospătare: buton „Reîmprospătează coordonate” în registru sau
```bash
cd apps/web && npx tsx --env-file=.env.local scripts/commerce/refresh-partner-coords.ts [--dry-run]
```
Zilnic e suficient, de exemplu `15 6 * * * cd /home/asns/projects/AdvancedSystems/agency-os/apps/web && npx tsx --env-file=.env.local scripts/commerce/refresh-partner-coords.ts >> ~/data/ecaroseria-feed/logs/partner-coords.log 2>&1`.

## DDL (aplicat manual, aditiv)
`packages/db/prisma/sql/commerce_service_partners.sql`, `commerce_service_partner_search.sql`, `commerce_service_partners_coords.sql`.

## Limite cunoscute
- Termenii Google Maps Platform (EEA) nu au putut fi citiți integral; regula de 30 de zile pentru coordonate vine din versiuni arhivate. Verifică secțiunea de caching din termenii specifici EEA și lista „Places API EEA permitted uses” înainte de a păstra alte câmpuri Google în lead-uri.
- Lead-urile Google au `email` gol (câmp obligatoriu în CRM); excluse din campanii prin `entityType`.
