# eCaroseria — sincronizare preț și stoc de la furnizor

Actualizează **prețurile** și **disponibilitatea** produselor din fișierele EDI ale furnizorului (`PRICELIST_34286.zip`, `OUTOFSTOCK_ALL.zip`) și recalculează prețurile la **cursul BNR**. Nu procesează GENUINE, REFAR, `exclude_products.csv`, imaginile sau dump-ul WordPress.

Cod: `apps/web/lib/commerce/sync/` · CLI: `apps/web/scripts/commerce/sync-supplier.ts` · pagină admin: `/commerce/sync`.

## Cele două joburi

| Job | Ce face | Când |
|---|---|---|
| `feed` | descarcă fișierele (FTPS, doar citire), le validează, actualizează costul furnizorului, prețul din shop și stocul pe depozit; produse noi → inactive, în coada de revizuire; produse dispărute → dezactivate (niciodată șterse) | zilnic 05:00 Europe/Bucharest, reîncercare la 2 ore până la 13:00 (fără fișiere noi = no-op) |
| `reprice` | recalculează `priceRon` din costul stocat dacă s-au schimbat cursul BNR sau formula | zilele lucrătoare 13:30 și 15:30 (BNR publică în jur de 13:00) |

Furnizorul regenerează fișierele în jur de **04:23 ora României** (mtime FTP 01:23 UTC), de aceea prima rulare e la 05:00, nu la 03:30.

Programare (cron, ca utilizatorul aplicației):

```bash
(crontab -l 2>/dev/null; cat <<'CRON'
CRON_TZ=Europe/Bucharest
0 5-13/2 * * * /home/asns/projects/AdvancedSystems/agency-os/apps/web/scripts/commerce/sync-supplier-cron.sh feed
30 13,15 * * 1-5 /home/asns/projects/AdvancedSystems/agency-os/apps/web/scripts/commerce/sync-supplier-cron.sh reprice
CRON
) | crontab -
```

Alternativ, un scheduler extern poate apela `POST /api/cron/commerce-sync?job=feed|reprice` cu `Authorization: Bearer $CRON_SECRET`.

Rulare manuală:

```bash
cd apps/web
npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job=feed --dry-run          # raport, nu scrie nimic
npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job=feed --dry-run --local-dir=/home/asns/data/ecaroseria-feed/extracted
npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job=reprice --dry-run
npx tsx --env-file=.env.local scripts/commerce/sync-supplier.ts --job=all                      # scrie doar dacă priceSync.enabled = true
```

Rapoartele JSON rămân în `$COMMERCE_SYNC_DATA_DIR/reports/`, fișierele brute (7 zile) în `raw/<data>/`, logurile cron în `logs/`.

## Variabile de mediu

`COMMERCE_FTP_PASSWORD` (obligatorie pentru FTP, doar din secretele mediului), `COMMERCE_FTP_HOST|PORT|USER` (implicit `ftp.doarpieseauto.ro`, 21, `env@doarpieseauto.ro`), `COMMERCE_FTP_CERT_SHA256` (opțional), `COMMERCE_SYNC_DATA_DIR`, `COMMERCE_SYNC_FEED` (`gr-main`), `COMMERCE_SYNC_BUSINESS_LINE` (`ecaroseria`), `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`.

Certificatul FTP este emis pentru `*.namebox.ro` (Sectigo, valid până la 2027-01-23): lanțul se verifică, doar numele serverului nu se compară. Amprentă SHA-256: `26:17:D4:67:69:7A:3E:0A:5A:4C:F0:16:78:D9:C1:6B:89:78:60:2C:6F:6B:B3:9E:4D:17:11:09:02:38:EE:FB`; dacă o fixezi în `COMMERCE_FTP_CERT_SHA256`, rulările se opresc la reînnoirea certificatului.

## Formula de preț

`preț RON = cost furnizor × curs BNR × (1 + adaos%) × (1 + TVA%)`, rotunjit **o singură dată**, la final (aritmetică zecimală exactă). Setările stau în `CommerceChannel.config.priceSync` și se editează din `/commerce/sync`: monedă sursă, sursa cursului (BNR), TVA %, adaos % (implicit **0**, cu excepții opționale pe categorie/brand), rotunjire (`none` = 2 zecimale, `99`, `90`, `integer`), preț minim, variație maximă automată (30%), prag minim de schimbare a cursului (0 = la orice schimbare).

Un adaos peste 0 este refuzat de rulări până când este aprobat explicit; orice modificare a valorii adaosului șterge aprobarea.

## Protecții

- **Scrierea e oprită implicit** (`priceSync.enabled = false` → orice rulare e dry-run). Prima rulare trebuie să fie dry-run.
- Fișier trunchiat (< 90% din rândurile ultimei rulări aplicate), gol, zip corupt (CRC) sau cu > 0,1% rânduri invalide → rularea se oprește înainte de orice scriere, cu alertă.
- Variație de preț > 30% față de prețul curent → nu se aplică, intră în coada de revizuire (aprobare/respingere în admin); un preț respins nu mai e semnalat la același preț furnizor.
- Dezactivări: dacă > 5% din catalogul activ lipsește din PRICELIST, nu se dezactivează nimic și se alertează.
- Repreț care ar muta > 1000 de prețuri cu mai mult de 30% (salt de curs/formulă) → se oprește.
- Un singur job care scrie la un moment dat (rând `running` unic în `CommerceSyncRun`), timeout global 45 min.
- FTP: doar `SIZE`, `MDTM`, `RETR`; o singură conexiune cu timeout-uri. Nimic nu se șterge/mută pe FTP sau în bucket-ul de imagini.
- Scrierile folosesc garduri optimiste (nu suprascriu un preț modificat între timp de altcineva).
- După prima aplicare reușită, importul complet (`feed/import.ts`) nu mai scrie `costPrice`, stocul sau starea activ/inactiv a produselor gestionate de sincronizare, iar motorul vechi de repreț pe trepte (`listings.ts`) nu mai rescrie prețurile când `priceSync.enabled`.

## Disponibilitate publică (`availability`)

Cu `stockFlagMeaning = supplier_confirm`: cel puțin un depozit (ath/the) cu 1 → `confirm_on_order`; ambele 0 → `out_of_stock`; fără date → `confirm_on_order`. `in_stock` rămâne rezervat stocului propriu. Cât timp mapping-ul e `unknown`, API-ul spune `confirm_on_order` pentru tot.

`updatedAt` al listării (sitemap) se mișcă doar când se schimbă prețul sau disponibilitatea publică.

## API

`GET /api/storefront/meta` → `{ currency: "RON", vatIncluded, priceUpdatedAt, fxRate, fxRateDate }` (`fxRate*` = cursul cu care sunt calculate prețurile live; `null` până la prima repreț). `vatIncluded` se controlează din setări („Etichetă TVA inclus”).

## Activare (în această ordine)

1. Aplică DDL-ul aditiv: `docker exec -i agency-os-postgres psql -U agency_os -d agency_os < packages/db/prisma/sql/commerce_supplier_sync.sql`
2. `sync-supplier.ts --job=feed --dry-run` și `--job=reprice --dry-run`; verifică rapoartele.
3. Setează `COMMERCE_FTP_PASSWORD` în mediul aplicației/cron.
4. În `/commerce/sync`: bifează „Scriere activată”, apoi **întâi** „Repreț la curs” (aliniază toate prețurile la formulă și setează cursul aplicat), **apoi** „Rulează acum (preț + stoc)”.
5. Instalează cron-ul.
6. Când ești de acord cu maparea disponibilității: `Disponibilitate publică = supplier_confirm`.

## Teste

- Unitare: `npx tsx --test lib/commerce/sync/__tests__/*.test.ts lib/commerce/__tests__/*.test.ts`
- Acceptare (pe o copie a bazei, refuză orice bază care nu se termină în `_synctest`): `scripts/commerce/sync-acceptance-setup.sh` pregătește copia, apoi `DATABASE_URL=…/agency_os_synctest npx tsx scripts/commerce/sync-acceptance.ts <director-scratch>`.
