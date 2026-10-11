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

## Comenzi cu serviciu, administrare și decontare

### Contract `POST /api/storefront/orders` (additiv)
`items[]` acceptă opțional, pe linie: `service: { partnerId, type: "mount"|"paint"|"paint_mount", paintCode?, vin? }`.
- Linia cu serviciu are `quantity: 1` (două piese = două linii). Toate serviciile unei comenzi folosesc **același** service partener (cel din `GET /api/storefront/service-partners`).
- `paintCode` este obligatoriu la `paint` / `paint_mount` (litere, cifre, spații, max. 40); `vin` opțional, 17 caractere.
- **Prețul serviciului nu se citește din cerere**: vine din tariful partenerului (`salePriceRon`, TVA inclus), cel pentru dimensiunea piesei (`bulky`) sau tariful „orice dimensiune”. Costul de decontare se îngheață în comandă.
- Cu serviciu, **piesa se livrează la service**: `shippingAddress` = service, `billingAddress` = adresa clientului.
- Răspuns `201`: `{ id, number, totalRon, productsTotalRon, servicesTotalRon }`.
- Un produs `out_of_stock` este refuzat (422) când maparea `supplier_confirm` este activă.
- Erori `422` cu mesaj în română, afișabil clientului.

### Date create
Fiecare serviciu comandat → linie `CommerceOrderItem` (`supplierCode = SRV:<tip>`) + rând `CommerceServiceJob` (`saleRon`, `settlementRon`, `paintCode`, `vin`, stare `pending → scheduled → done → settled`, `cancelled`). DDL: `packages/db/prisma/sql/commerce_service_jobs.sql`.

### Administrare
- `/commerce/orders` și `/commerce/orders/[id]`: listă și detaliu, stare comandă (De confirmat, Confirmată, Piesă comandată la furnizor, Piesă la service, Lucrare programată, Gata de ridicat, Expediată, Livrată, Anulată, Returnată), note, lucrările de service (programează / finalizată / anulează / redeschide), mesaj de copiat către service. Starea comenzii sincronizează lead-ul din CRM (nou → comandă → livrat). Anularea comenzii anulează lucrările deschise.
- `/commerce/settlements`: pe partener, ce datorăm (lucrări **finalizate**, nedecontate), ce am plătit, în lucru, marja. Selectezi lucrările finalizate și le marchezi decontate cu o referință (OP/factură). Doar lucrările `done` ale aceluiași partener se pot deconta.
- Lead-urile partenerilor au tipul CRM propriu „Service partener” (`entityType = service_partners`), separate de clienți (`customers`).

### Reguli stabilite (de confirmat cu proprietarul)
- Lucrarea e „datorată” când e marcată **finalizată** în ERP.
- Retur sau lucrare nereușită: nu e automatizat; se anulează/redeschide lucrarea și se rezolvă manual în decontare.
- Prețul de vânzare al serviciului este TVA inclus (TVA din comandă = formula obișnuită, 21%).
- Partenerul este notificat manual (mesaj de copiat + „marchează notificat").

## Furnizori pe linii de business și legătura partener → furnizor

**Furnizori pe linie.** `Supplier.businessLineIds` (migrare `supplier_business_lines.sql`): listă **goală = furnizor comun, apare pe toate liniile** (cazul tuturor furnizorilor existenți: software, bănci etc.); listă cu linii = apare doar pe acelea. `GET /api/suppliers?businessLineId=<id>` întoarce furnizorii comuni + cei ai liniei; fără parametru (sau `all`) = vedere consolidată. Lista Furnizori filtrează automat după linia activă și are coloana „Linii”; se editează din „Editează Fiscalitate”, în bulk (bara de selecție) și prin API (`businessLineIds` la POST/PATCH/bulk; ids inexistente → 400).

**Partener → furnizor.** Prospect = lead CRM; partener acceptat = rând în registru (tarife, lucrări, decontare); furnizor = firma care ne facturează (CUI, IBAN, facturi, plăți). Legătura (`CommerceServicePartner.supplierId`) e opțională și se face din editorul partenerului: „Creează furnizor” (apare doar pe linia eCaroseria; CUI exact ca în factură, cu `RO` dacă e plătitor de TVA, pentru că potrivirea facturilor e pe CUI exact; fără CUI → preluare manuală) sau asociere cu un furnizor existent vizibil pe linie. Un CUI deja existent nu se dublează. În Decontări se arată furnizorul legat (sau un avertisment) și se recomandă numărul facturii lui ca referință.
