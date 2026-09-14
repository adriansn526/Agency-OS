# Prompt pentru agentul de dev — Dashboard Proiecte Web Dev

> Context: lucrezi în ERP-ul de agenție (fork din IntraConstruct-ERP), Next.js + Prisma.
> Acest document înlocuiește/extinde planul inițial de "Dashboard Premium de Dezvoltare Web".
> Respectă convențiile existente în cod: `tenantId` obligatoriu pe query-uri, pattern-ul de
> API routes existent, și verifică `/mnt/skills/public/frontend-design/SKILL.md` (sau
> echivalentul din proiect) înainte de a scrie orice componentă vizuală nouă — reutilizează
> design tokens existente, nu introduce o paletă nouă doar pentru acest modul dacă proiectul
> are deja unul definit.

---

## Principii transversale (valabile în toate fazele)

1. **Config-driven, nu if/else pe templateId.** De la Faza 1, creează un registry de tip
   `projectTypeConfig` (obiect/map care leagă `templateId` → ce module/carduri se randează,
   ce e client-facing vs intern). Nu hardcoda `['website', 'dev_template'].includes(...)`
   direct în `page.tsx` — pune-l într-un fișier de config separat, ușor de extins când apar
   alte verticale (SEO, campanii etc.).
2. **Niciun date fake care seamănă cu monitoring live.** Orice card care arată status de
   infrastructură, deploy, uptime — dacă datele sunt statice/manuale, trebuie să fie vizual
   marcat ca atare (badge + timestamp "actualizat manual"), sau vizibil doar intern, până
   e conectat la un API real.
3. **Schema de metadata tipizată.** Orice câmp nou salvat în `project.metadata` (URL-uri,
   scoruri Lighthouse, status deploy etc.) trebuie să aibă un tip TypeScript + validare Zod,
   nu doar `Record<string, any>`.
4. **Permisiuni client vs. intern definite explicit per card**, nu adăugate ulterior.

---

## FAZA 1 — MVP Dashboard (vizual, date manuale, uz intern + client limitat)

### Obiectiv
Înlocuiește UI-ul generic din tab-ul Overview cu dashboard-ul dedicat pentru proiecte de
tip Web Dev, folosind date introduse manual de echipă. Fără integrări externe încă.

### 1. Config & detectare tip proiect

- Creează `lib/project-types/config.ts` (sau echivalent după convenția proiectului) cu o
  structură de forma:
  ```ts
  type ProjectTypeConfig = {
    templateIds: string[];
    dashboardVariant: 'webdev' | 'generic' | ...;
    cards: {
      id: string;
      visibility: 'internal' | 'client' | 'both';
    }[];
  };
  ```
- `dev_template` și `website` rămân ambele mapate la varianta `webdev` pentru acest sprint.
  **Adaugă un task separat, notat explicit ca TODO în cod** (`// TODO: consolidare pe un
  singur templateId canonic + migrare proiecte existente`), nu rezolva acum.
- `isWebDevProject` se calculează prin acest config, nu printr-un array inline în `page.tsx`.

### 2. Schema de metadata (Zod)

- Definește un schema Zod `WebDevProjectMetadata` cu câmpuri opționale:
  `stagingUrl`, `productionUrl`, `adminUrl`, `figmaUrl`, `githubUrl`, `driveUrl`,
  `lighthouse: { performance, accessibility, bestPractices, seo, updatedAt }`,
  `pipelineStage` (enum: discovery/design/frontend/backend/qa/launch).
- Validează la citire/scriere; nu scrie chei arbitrare direct în JSON din UI.

### 3. Card: Quick Links & Resurse

- Butoane pentru Staging/Production/Admin URL (doar dacă sunt completate — vezi empty states).
- Hub de resurse: Figma, GitHub, Drive.
- **Client-facing:** Staging + Production URL. **Intern:** Admin URL, GitHub, Drive
  (poți ajusta, dar decide explicit acum, nu implicit).

### 4. Card: Pipeline & Etape

- Bară orizontală: Discovery → Design → Frontend → Backend → QA → Launch.
- Colorare în funcție de % checklist bifat per etapă (nu doar % agregat pe tot proiectul —
  vezi Faza 2 pentru responsabili/deadline per etapă dacă timpul permite acum, altfel amânat).
- **Client-facing.**

### 5. Card: Performanță (Lighthouse) — placeholder editabil

- Grafice circulare Performance/Accessibility/Best Practices/SEO.
- Valori introduse/editate manual din UI, salvate în `metadata.lighthouse`.
- **Obligatoriu:** afișează "Actualizat manual la [dată]" lângă scoruri — nu lăsa impresia
  de date live.
- **Client-facing**, cu acest disclaimer vizibil.

### 6. Card: Status Infrastructură — DOAR INTERN în această fază

- Terminal simulativ (deploy status, branch, uptime) — **vizibil doar echipei**, nu clientului,
  până se conectează la un API real (Faza 3).
- Alternativ, dacă trebuie să fie vizibil și clientului acum: badge foarte vizibil
  "Date demonstrative — conectare API în etapa 2" pe tot cardul.

### 7. Empty states

- Fiecare card trebuie să aibă o stare goală clară cu call-to-action ("Adaugă link Figma"),
  nu card gol sau ascuns silențios.

### 8. Editare metadata din UI

- Modal/panou lateral pentru a edita câmpurile de mai sus, validat prin schema Zod de la punctul 2.

### Verificare Faza 1

- Build local trece.
- Proiectul de test (`TENTROM PARADISE`, `templateId: dev_template`) arată noul dashboard.
- Un proiect non-webdev (ex. construcții, din fork-ul original) **nu e afectat** — testează
  explicit regresia asta.
- Light mode + dark mode.
- Empty states verificate pe un proiect webdev fără nicio metadata completată.

---

## FAZA 2 — Îmbunătățiri de utilitate (tot cu date manuale, fără integrări externe)

Se face după validarea Fazei 1 cu echipa/clienți reali.

### 1. Card Domenii & DNS/SSL

- Câmpuri: dată expirare domeniu, dată expirare SSL, provider DNS.
- Alertă vizuală (culoare/badge) când expirarea e sub 30/14/7 zile.
- **Client-facing parțial** — decide dacă data expirării domeniu e ok pentru client, dar
  detaliile de provider DNS rămân interne.

### 2. Pipeline cu responsabili & deadline per etapă

- Extinde cardul de Pipeline (Faza 1, punct 4): fiecare etapă are un `assignee` opțional
  și un `dueDate` opțional, afișate ca sub-etichetă pe bara de progres.

### 3. Card Note interne

- "Sticky notes" vizibile doar echipei, separat de checklist/task-uri, pentru context rapid.
- Strict intern.

### 4. Istoric/changelog manual

- Feed simplu "ce s-a livrat și când", introdus manual (pregătit arhitectural pentru
  auto-populare din commit-uri GitHub în Faza 3).

### 5. Tagging tehnologie/stack

- Câmp `stack` (WordPress / Next.js / Shopify / custom etc.) pe proiect, util pentru
  filtrare la nivel de agenție. Nu neapărat vizibil pe dashboard-ul individual — util mai
  ales în lista de proiecte.

### 6. Trend Lighthouse

- În loc de un singur scor curent, păstrează istoric (array de snapshot-uri cu timestamp)
  și afișează un mini-grafic de evoluție.

---

## FAZA 3 — Integrări reale (necesită credențiale/API keys, scop separat de sprint-ul de UI)

Nu începe fără aprobare explicită separată — implică secrete și acces la servicii externe.

### 1. GitHub/Vercel webhook real

- Înlocuiește terminalul simulativ din Faza 1 cu date reale de la GitHub Actions/Vercel
  (deploy status, branch, uptime real).
- Odată conectat, cardul poate deveni client-facing fără disclaimer.

### 2. PageSpeed Insights API pentru Lighthouse

- Job periodic (cron) care rulează PSI API și populează `metadata.lighthouse` automat,
  păstrând totuși posibilitatea de override manual dacă e nevoie (marcat clar diferit
  de valorile automate).

### 3. Card Credențiale/Acces

- Integrare cu un password manager (sau minim: acces restricționat pe rol, criptare la
  rest) pentru hosting/CMS/conturi terțe. **Nu stoca text plain în UI/DB.**

### 4. Notificări/alerte automate

- SSL/domeniu aproape de expirare, deploy picat, task overdue → notificare (email/in-app).

### 5. Export raport client (PDF/link public)

- Buton care generează un raport doar cu secțiunile marcate `client-facing` din config
  (Faza 1, punct 1) — reutilizează direct câmpul `visibility` din `projectTypeConfig`.

### 6. Portal client limitat (read-only, token/link)

- Variantă mai ambițioasă decât raportul static: view separat, accesibil printr-un
  link/token, care randează live cardurile marcate `client`. Înlocuiește nevoia de
  show/hide condiționat împrăștiat prin cod.

---

## Open Questions — răspunsuri / decizii pentru Faza 1

1. **`website` vs `dev_template`** → ambele acceptate acum prin config (punct 1), cu TODO
   explicit de consolidare ulterioară.
2. **Paletă Blue/Indigo + dark mode** → verifică întâi dacă există deja design tokens
   definite în proiect (`frontend-design` skill / fișier de tokens existent); reutilizează-le
   dacă da. Dacă nu există niciunul, propune paletă nouă dar documentează alegerea.
3. **Lighthouse placeholder** → da, cu disclaimer "actualizat manual" obligatoriu (Faza 1,
   punct 5).

---

## Criterii de acceptare — Faza 1 (ce se livrează acum)

1. `projectTypeConfig` există și controlează atât randarea cardurilor cât și vizibilitatea
   client/intern — nicio logică `if templateId === ...` inline în `page.tsx`.
2. Schema Zod pentru metadata există, e folosită la citire și scriere.
3. Toate cardurile din Faza 1 au empty state.
4. Cardul de Status Infrastructură e intern-only SAU are badge de date demonstrative.
5. Cardul Lighthouse afișează timestamp de actualizare manuală.
6. Proiect non-webdev existent nu e afectat vizual (test de regresie explicit).
7. Light + dark mode verificate.
