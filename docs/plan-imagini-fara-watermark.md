# Plan: imagini fără watermark pentru catalogul eCaroseria

Situația: cele 121.667 de poze din bucket (copiate de pe FTP-ul furnizorului) au watermark; furnizorul nu le dă curate. 110.722 de produse active, 1.272 fără nicio poză. Cheia de căutare este codul OE (`oeMain` la 104.886 de produse, plus `CommerceOeCode`).

## Principii
- Pozele noi se urcă în bucket sub chei opace, fără cod de furnizor: `manual/<cod-public>/<n>.jpg` (prefixul `manual/` are deja prioritate în API față de pozele automate, deci o poză nouă o înlocuiește fără nicio schimbare de cod).
- Se înlocuiește doar când avem o poză curată și sigură pentru EXACT aceeași piesă (potrivire pe OE). O poză greșită e mai gravă decât una cu watermark.
- Licențe: o poză găsită pe Google Images nu este liberă de drepturi. Folosim surse cu drept de utilizare (API-uri de catalog, feed-uri de brand, poze proprii) și păstrăm sursa și licența per poză.

## Etape
1. **Prioritizare (zi 1).** Lista produselor după cerere (`/commerce/trends`, scorul de cerere) și după lipsa pozei. Primele ~2.000 de produse acoperă cea mai mare parte din trafic.
2. **Surse oficiale / API-uri (săptămâna 1).** În ordinea costului și a siguranței:
   - Catalogul TecDoc (RapidAPI deja testat: nu are poze utilizabile pe planul actual; se verifică planul plătit sau alt furnizor TecDoc cu `imageUrl`).
   - Feed-urile producătorilor aftermarket (Valeo, Hella, TYC, Depo, Blic etc.): au poze de catalog fără watermark și deseori fișiere pe cerere, cu cod de articol + OE cross-reference.
   - Marketplace-uri cu API (eBay Browse API, Amazon PA-API) doar ca sursă de identificare, nu de copiat poze.
3. **Căutare pe Google Images după OE (săptămâna 2, pilot de 500).** DataForSEO (SERP Google Images) sau Google Programmable Search cu `searchType=image`, interogare `"<OE>" <brand>`; rezultatele sunt candidate, nu se publică automat.
4. **Filtru automat de calitate.** Pe fiecare candidat: dimensiune minimă (800 px), detecție de watermark/text suprapus (model de viziune, de ex. Claude cu imaginea), fundal curat, potrivire a piesei (aceeași formă și latură). Scor + motiv salvate.
5. **Aprobare manuală.** Pagină în ERP (`/commerce/images/review`): candidatul lângă poza actuală, buton Aprobă/Respinge, sursa afișată. Doar cele aprobate se urcă.
6. **Încărcare.** Cheie de scriere în bucket (`COMMERCE_IMAGES_S3_KEY/SECRET`, încă nesetate). Marcăm `source='manual'`; triggerul din sitemap mută `lastmod` doar la prima poză.
7. **Opțional: curățare watermark prin AI.** Se poate testa pe un eșantion de 100, dar cere verificare vizuală strictă și are risc juridic (marca furnizorului); nu recomand fără acordul tău.

## Metrici
Acoperire = produse cu poză curată / total, pe categorii; rata de respingere la aprobare; cost per poză acceptată (DataForSEO ≈ $0,002 la căutare, de verificat).

## Ce rămâne de decis
Sursele permise (tu), bugetul API, cine aprobă pozele, dacă pozele cu watermark rămân ca fallback sau produsul devine `noindex` până apare una curată.
