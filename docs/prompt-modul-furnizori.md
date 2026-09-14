# Prompt pentru agentul de dev — Modul Furnizori, Ingestie Automată Facturi/Extrase & Pachet Contabilitate Lunar

> Context: ERP de agenție (fork din IntraConstruct-ERP), Next.js + Prisma. Respectă
> convențiile existente în cod (tenantId obligatoriu pe query-uri, pattern-ul de API
> routes existent). Verifică design tokens existente înainte de UI nou.

---

## Principii transversale (valabile în toate fazele)

1. **Niciun secret în text simplu.** Parole, tokenuri OAuth, chei API — întotdeauna în
   variabile de mediu / secret manager, niciodată în DB necriptat, în `metadata` JSON,
   sau hardcodate în cod. Orice câmp de tip „notă" trebuie să aibă disclaimer vizibil
   că nu e loc pentru credențiale.
2. **Nimic automat nu se confirmă fără review uman**, dacă provine din extracție LLM
   (facturi sau tranzacții din extras). Extracția populează o coadă de „pending
   review", nu creează direct înregistrări finale.
3. **Deduplicare pe sursă + referință**, nu doar pe sumă/dată — evită facturi/tranzacții
   duplicate când aceeași informație vine din mai multe canale (email + API).
4. **Audit trail** pe orice acțiune automată care atinge date financiare: cine/ce proces
   a citit un extras, cine a confirmat o factură, cine a trimis pachetul lunar.

---

## FAZA 1 — Model de date de bază + upload manual

### Obiectiv
Fundația modulului de Furnizori, funcțională fără nicio automatizare, ca să valideze
UX-ul înainte de a investi în ingestie automată.

### Schema Prisma (nouă)

```prisma
model Supplier {
  id            String   @id @default(cuid())
  tenantId      String
  name          String
  cui           String?
  iban          String?
  category      String?
  isRecurring   Boolean  @default(false)
  expectedDay   Int?     // ziua din lună la care se așteaptă factura, dacă recurent
  status        String   @default("active") // active | inactive
  createdAt     DateTime @default(now())
  invoices      Invoice[]

  @@index([tenantId])
}

model Invoice {
  id                String   @id @default(cuid())
  tenantId          String
  supplierId        String
  supplier          Supplier @relation(fields: [supplierId], references: [id])
  amount            Decimal
  currency          String   @default("RON")
  issueDate         DateTime
  dueDate           DateTime?
  invoiceNumber     String?
  pdfUrl            String
  status            String   @default("unpaid") // unpaid | partial | paid
  source            String   // manual | email | api
  sourceRef         String?  // message-id / api-transaction-id
  extractionStatus  String   @default("confirmed") // pending_review | confirmed | rejected
  extractedBy       String?  // llm | api_native | human
  createdAt         DateTime @default(now())
  payments          Payment[]

  @@unique([supplierId, invoiceNumber])
  @@index([tenantId])
}

model Payment {
  id          String   @id @default(cuid())
  tenantId    String
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
  amount      Decimal
  paidAt      DateTime
  method      String?
  createdAt   DateTime @default(now())

  @@index([tenantId])
}

model BankConnection {
  id                String   @id @default(cuid())
  tenantId          String
  bankName          String
  accountIban       String   // contul operațional relevant, restul secțiunilor din PDF sunt ignorate
  statementPasswordEnvKey String? // numele variabilei de mediu care conține parola, NU parola însăși
  createdAt         DateTime @default(now())

  @@index([tenantId])
}

model BankTransaction {
  id              String   @id @default(cuid())
  tenantId        String
  bankConnectionId String
  date            DateTime
  description     String
  debit           Decimal  @default(0)
  credit          Decimal  @default(0)
  category        String?  // supplier_payment | bank_fee | internal_transfer | legal_payment | incoming_payment
  extractedMerchant String?
  matchedSupplierId String?
  matchedInvoiceId  String?
  matchStatus     String   @default("unmatched") // unmatched | auto_matched | manually_matched
  extractionStatus String  @default("confirmed") // pending_review | confirmed
  sourcePdfUrl    String
  createdAt       DateTime @default(now())

  @@index([tenantId])
}
```

### UI Faza 1

- `apps/web/app/(dashboard)/suppliers/page.tsx` — listă furnizori, CRUD, flag „recurent" + zi așteptată.
- `apps/web/app/(dashboard)/suppliers/[id]/page.tsx` — detaliu furnizor, listă facturi, listă plăți.
- Formular upload manual factură (PDF + câmpuri: sumă, dată, nr. factură) — `source: 'manual'`.
- Formular upload manual extras de cont (PDF) — stocare brută, fără parsare încă (parsarea vine în Faza 3).

### Verificare Faza 1
- CRUD complet pe Supplier/Invoice/Payment funcțional.
- Upload manual de PDF funcțional, fișiere ajung în storage-ul existent al proiectului.
- Niciun model existent din schema Prisma nu e afectat.

---

## FAZA 2 — Ingestie automată facturi (email generic + API Google Ads, în paralel)

### 2.1. Flux A — Parsare email (generic, acoperă orice furnizor nou fără cod dedicat)

- Inbox dedicat (ex. `facturi@agentia.ro`), acces prin **OAuth (Gmail API)**, nu parolă IMAP în text simplu.
- Worker periodic (cron sau trigger la webhook Gmail push, dacă disponibil):
  1. Citește emailuri noi din inbox.
  2. Extrage atașamentele PDF.
  3. Trimite fiecare PDF la un prompt LLM de extracție structurată (Zod schema de output:
     `supplierName`, `amount`, `currency`, `issueDate`, `invoiceNumber`).
  4. Matching fuzzy `supplierName` → `Supplier` existent; dacă nu găsește, marchează ca
     „furnizor nou detectat", propus spre confirmare (nu creează automat).
  5. Creează `Invoice` cu `source: 'email'`, `sourceRef: <message-id>`,
     `extractionStatus: 'pending_review'`.
- **UI de review:** ecran cu PDF-ul alături de câmpurile extrase, editabile, buton
  Confirmă / Respinge. Doar la confirmare `extractionStatus` devine `confirmed`.

### 2.2. Flux B — API Google Ads (date structurate, fără LLM)

- OAuth către Google Ads API, extrage facturile direct din endpoint-ul de billing.
- Creează `Invoice` cu `source: 'api'`, `sourceRef: <api-invoice-id>`,
  `extractedBy: 'api_native'`, `extractionStatus: 'confirmed'` (date structurate, nu
  necesită review manual ca la extracția LLM din PDF).
- Independent de Flux A la nivel de cod — pot fi dezvoltate în paralel.

### 2.3. Deduplicare

- Constrângerea `@@unique([supplierId, invoiceNumber])` din schema Prisma previne
  duplicate dacă `invoiceNumber` e extras corect din ambele fluxuri pentru același
  furnizor (relevant dacă vreodată un furnizor ajunge să aibă atât email cât și API).

### Verificare Faza 2
- Test cu un email real conținând o factură PDF → apare în coada de review cu date corecte.
- Confirmare manuală → `Invoice` trece în `confirmed`, apare în lista furnizorului.
- Sincronizare Google Ads API → facturi apar automat, fără trecere prin coadă.
- Furnizor nou (nu există în `Supplier`) → propus, nu creat automat.

---

## FAZA 3 — Ingestie extras de cont (parolă fixă, filtrare cont, extracție tranzacții)

### 3.1. Decriptare PDF

- Parola e citită dintr-o variabilă de mediu / secret manager, referențiată prin
  `BankConnection.statementPasswordEnvKey` — **niciodată hardcodată sau stocată în DB
  în text simplu**.
- Pas de decriptare (ex. `pikepdf`/`qpdf` cu parola din env) înainte de orice extracție
  de text.
- Loghează (audit trail) fiecare decriptare automată: timestamp, `BankConnection.id`,
  rezultat succes/eroare.

### 3.2. Detectare secțiuni de cont în PDF

- Un singur PDF poate conține mai multe sub-conturi (ex. cont curent, cont de sume
  blocate, cont de poprire) — fiecare cu propriul antet „CONT ... IBAN: ...".
- Parserul identifică secțiunile prin acest antet și **procesează doar secțiunea al
  cărei IBAN se potrivește cu `BankConnection.accountIban`** configurat. Restul
  secțiunilor sunt ignorate pentru fluxul de furnizori (dar PDF-ul original complet
  rămâne atașat la pachetul lunar, pentru context, dacă e nevoie).

### 3.3. Extracție tranzacții + identificare furnizor

- Pentru fiecare linie de tranzacție din secțiunea relevantă (Data, Descriere, Debit,
  Credit): trimite descrierea la LLM cu prompt de extracție (Zod schema):
  `merchantName` (normalizat), `category` (enum: `supplier_payment` | `bank_fee` |
  `internal_transfer` | `legal_payment` | `incoming_payment`), `confidence`.
- Doar liniile `category: 'supplier_payment'` cu încredere suficientă intră automat în
  matching fuzzy cu `Supplier`; restul apar informativ în raport, fără matching.
- Sub pragul de încredere → `extractionStatus: 'pending_review'`, apare în coadă
  similar cu facturile.
- Creează `BankTransaction` per linie, cu `matchedSupplierId` populat dacă matching-ul
  a reușit.

### 3.4. Reconciliere tranzacție ↔ factură

- Matching automat opțional: `BankTransaction` cu `matchedSupplierId` + sumă apropiată
  + dată apropiată de o `Invoice` neplătită a aceluiași furnizor → `matchStatus:
  'auto_matched'`, actualizează `Invoice.status` la `paid`.
- Ecran de reconciliere manuală pentru tranzacțiile nepotrivite automat.

### Verificare Faza 3
- Extras PDF cu parolă (din variabila de mediu configurată) se decriptează corect.
- Pe un extras cu mai multe sub-conturi, doar secțiunea cu IBAN-ul configurat e
  procesată — verifică explicit că tranzacțiile din celelalte secțiuni NU apar în
  `BankTransaction`.
- Linii de tip comision bancar / transfer intern / poprire sunt categorizate corect și
  NU intră în matching de furnizor.
- O plată OP către un furnizor cunoscut (nume explicit în descriere) e matched automat
  cu `Supplier` corect.
- O plată prin procesator de card (nume de comerciant variabil în descriere) trece prin
  coada de review dacă încrederea e scăzută.

---

## FAZA 4 — Pachet Contabilitate Lunar

### 4.1. Verificare completitudine

- Pentru fiecare `Supplier` cu `isRecurring: true`, verifică dacă există o `Invoice`
  `confirmed` pentru luna curentă. Dacă lipsește, semnalează explicit în ecranul de
  generare a pachetului ("ElevenLabs — nicio factură primită pentru luna curentă").
- Blochează generarea pachetului dacă mai există `Invoice` sau `BankTransaction` cu
  `extractionStatus: 'pending_review'` din perioada respectivă.

### 4.2. Generare arhivă

```
{AAAA-LL}_Pachet-Contabilitate/
├── index.csv                 → listă facturi (furnizor, nr., dată, sumă), total lunar
├── Facturi/
│   └── {Furnizor}_{Data}_{Suma}{Moneda}.pdf
└── Extras-Cont/
    └── Extras_{AAAA-LL}.pdf
```

### 4.3. Ecran de confirmare + trimitere

- Preview înainte de trimitere: listă facturi incluse + total, alerte de completitudine,
  extras de cont atașat.
- Buton „Trimite la contabilitate" → email cu arhiva atașată (sau link de download dacă
  depășește limita de atașament) către adresa configurată a contabilului.
- Salvează istoric: dată, cine a confirmat trimiterea, conținutul pachetului (pentru
  referință ulterioară în caz de discrepanțe).

### Verificare Faza 4
- Pachet generat pentru o lună cu toate facturile confirmate → arhivă corectă, index.csv
  cu totaluri corecte.
- Furnizor recurent fără factură luna curentă → alertă vizibilă înainte de trimitere.
- Factură în `pending_review` → blochează generarea, cu mesaj explicit.
- Trimitere email → necesită click explicit de confirmare, nu se trimite automat fără
  interacțiune umană.
- Istoric de pachete trimise accesibil ulterior.

---

## Note pentru agent, înainte de a începe codul

1. Confirmă cu utilizatorul formula exactă de acces la parola extrasului (numele
   variabilei de mediu) — nu presupune și nu cere valoarea în text, doar numele cheii.
2. Confirmă adresa de email a contabilului unde se trimite pachetul (configurabilă per
   tenant, nu hardcodată).
3. Verifică limita de mărime a atașamentelor pentru providerul de email folosit; dacă
   arhiva depășește limita, implementează fallback pe link de download temporar.
