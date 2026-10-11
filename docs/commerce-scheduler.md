# Programări (planificator intern pentru joburile Commerce)

Pagina `/commerce/schedules` (link „Programări” în Commerce) înlocuiește crontab-ul pentru cele trei joburi:

| Job | Ce face | Program implicit |
|---|---|---|
| `feed_sync` | Sincronizare preț și stoc de la furnizor (FTP) | zilnic, la fiecare 2 ore, 05:00–13:00 |
| `reprice` | Repreț la cursul BNR | Luni–Vineri, 13:30 și 15:30 |
| `partner_coords` | Coordonate service-uri partenere | zilnic, 06:15 |

Ora este ora României (se ajustează la ora de vară/iarnă). Programul se poate schimba din pagină: ore fixe sau „la fiecare N ore între HH:MM și HH:MM”, pe zile ale săptămânii.

## Cum funcționează
- Starea (comutatoare, program, următoarea rulare, istoric) este în baza de date (`CommerceSchedulerState`, `CommerceScheduledJob`, `CommerceScheduledJobRun`; DDL `packages/db/prisma/sql/commerce_scheduler.sql`).
- Serverul ERP de **producție** pornește o buclă la 30 de secunde (`instrumentation.ts` → `lib/commerce/scheduler/engine.ts`) care rulează joburile scadente. Serverele de dezvoltare nu pornesc planificatorul. `SCHEDULER_DISABLED=1` în mediu îl oprește complet.
- **Nu rulează nimic** până nu sunt bifate planificatorul **și** jobul (ambele sunt oprite implicit).
- Un singur rând rulează la un moment dat pentru fiecare job, între toate procesele (lock în baza de date, expiră după timeout + 5 minute).
- Fără rulări „în rafală” după o pauză: după fiecare rulare, următoarea se calculează de la momentul curent. O rulare scadentă care întârzie mai mult decât perioada de grație (feed 3 h, repreț 2 h, coordonate 6 h; serverul era oprit sau repornit) este marcată „ratat” și sărită.
- „Rulează acum” și „Dry-run” folosesc același lock și nu mută programul.
- La eșec programat se trimite alertă (ERP + Telegram), o singură dată la 12 ore pentru același mesaj.
- Sincronizarea și repreț-ul scriu în catalog **doar** dacă „Scriere activată” este bifat în Sincronizare preț și stoc; pagina Programări avertizează când este.

## De știut
- Cheile și parolele (FTP, Google, Telegram) rămân în `.env.local`; pagina arată doar dacă sunt configurate.
- Dacă ai instalat deja intrări de crontab pentru aceleași joburi, folosește doar un mecanism (cron-ul sau planificatorul): rulările suprapuse sunt sigure (lock, iar a doua rulare nu are ce face), dar inutile.
- Joburile grele rulează în procesul serverului web. Un deploy în timpul unei rulări o întrerupe; următoarea scadență o reia.
- Scripturile CLI (`scripts/commerce/sync-supplier.ts`, `refresh-partner-coords.ts`) rămân disponibile pentru rulări manuale.
