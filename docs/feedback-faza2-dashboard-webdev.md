# Feedback pe Planul „Dashboard Web Dev (Faza 2) & Integrare Rapoarte”

> Nu aprob execuția în forma actuală. Planul amestecă două scope-uri diferite și conține
> un risc de bug care poate afecta rapoartele lunare pe toate tipurile de proiecte, nu
> doar Web Dev. Mai jos sunt punctele care trebuie clarificate/despărțite înainte de a
> începe implementarea.

---

## 0. Separă planul în două task-uri distincte

Tot ce ține de **rapoarte AI/Gemini (punctul 3 din plan)** nu are legătură cu dashboard-ul
de Web Dev — e o modificare pe un sistem folosit de toate tipurile de proiecte (Ads, SEO
etc.), nu doar Web Dev. Trimite-l ca prompt/PR separat, cu propriul verification plan.
Motivul: dacă apare o problemă la review, vreau să știu dacă a fost cauzată de schimbarea
la dashboard-ul Web Dev sau de cea la promptul AI — amestecate într-un singur plan, nu pot
izola cauza.

Restul feedback-ului e organizat pe cele două scope-uri.

---

## A. Scope Dashboard Web Dev (Faza 2)

### A1. Decizie explicită: registry de integrări sau schema monolitică?

Planul extinde direct `WebDevProjectMetadata` cu câmpuri noi (`domainExpiryDate`,
`sslExpiryDate`, `changelog`, `stack`) — exact pattern-ul discutat anterior ca fiind
problematic pe termen mediu (fiecare integrare nouă = câmpuri noi + card nou hardcodat).

Nu cer neapărat introducerea registry-ului acum, dar cer o decizie explicită, scrisă în
plan, nu o alunecare tăcută spre schema monolitică:
- **Opțiunea A:** rămânem pe schema Zod monolitică pentru Faza 2, notat explicit ca debt
  tehnic conștient, cu un TODO care trimite la introducerea registry-ului de integrări
  într-o fază viitoare.
- **Opțiunea B:** introducem acum modelul de `Integration` (id, category, status,
  visibility, dataSource, lastUpdated) cât sunt încă puține integrări de migrat.

Spune-mi care variantă alegi și de ce, înainte de a scrie cod.

### A2. Vizibilitate mixtă per card — tot nerezolvată

Cardul de Domenii & SSL e notat „Parțial client-facing”, la fel ca la Faza 1 (Quick Links).
Dacă modelul de vizibilitate rămâne pe card întreg (`internal` / `client` / `both`), acest
„parțial” nu poate fi exprimat corect în cod și va fi improvizat ad-hoc de fiecare dată
când apare. Rezolvă asta o singură dată, la nivel de config (vizibilitate per element din
card, nu doar per card), nu per-caz.

### A3. Widget-ul de raport lunar trebuie să includă changelog-ul

Open Question 2 propune widget-ul de raport cu doar Pipeline Stage + Lighthouse + rezumat
checklist. Dar tocmai adăugați `changelog` la punctul 1 — un rezumat „ce am livrat luna
asta”, filtrat pe intervalul raportului, e mai relevant pentru client decât un scor
Lighthouse static. Include changelog-ul filtrat pe perioadă în widget.

### A4. Confirmă verification plan-ul de regresie

Pe lângă testele descrise (alerte SSL/domeniu), verifică explicit că un proiect non-Web-Dev
existent nu e afectat de extinderea schemei/modalului.

---

## B. Scope Rapoarte AI (separat, punctul 3 din plan original)

### B1. Bug potențial: dată hardcodată în promptul trimis către Gemini

Instrucțiunea propusă — *„În perioada 15 august — 14 septembrie 2026, [Domeniu]”* — dacă
e introdusă literal în promptul de sistem, va produce aceeași perioadă fixă pe **toate**
rapoartele viitoare, indiferent de luna reală în care sunt generate. Presupun că intenția
e un *format* („În perioada [dată start] — [dată sfârșit] [an], [Domeniu]”) cu valorile
calculate dinamic din perioada reală a raportului, nu text fix.

Clarifică și confirmă explicit înainte de implementare — e genul de bug care nu se vede la
un test rulat acum (septembrie) și apare abia la raportul din luna următoare.

### B2. Regresie pe proiecte non-Web-Dev

Modificarea promptului AI afectează toate tipurile de proiecte care generează rapoarte
lunare (Ads, SEO etc.), nu doar Web Dev. Verification plan-ul trebuie să includă explicit
regenerarea unui raport pe un proiect Ads/SEO normal (fără Web Dev), pentru a confirma că
formatarea și menționarea cifrelor KPI (trafic, CTR, ROAS) existente nu s-au stricat.

### B3. Widget-ul de Web Dev în raport — depinde de A1

Integrarea vizuală din punctul 4 al planului original (secțiune dedicată `dev_template` în
pagina de raport) ar trebui construită peste decizia luată la A1 — dacă alegeți registry-ul
de integrări, widget-ul de raport citește din el generic; dacă rămâneți pe schema
monolitică, widget-ul rămâne cod dedicat, dar notează asta ca debt tehnic la fel ca A1.

---

## Ce aștept înapoi

1. Plan Web Dev Faza 2 revizuit, cu decizia de la A1 explicită și A2 rezolvată la nivel de
   config.
2. Plan separat (sau task separat) pentru fix-ul de prompt AI, cu B1 clarificat înainte de
   cod și B2 inclus explicit în verification plan.
