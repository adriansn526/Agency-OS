# Proceduri de Deploy: Agency OS

Această aplicație folosește **GitHub Actions** pentru procesul de CI/CD (Continuous Integration / Continuous Deployment). Asta înseamnă că build-ul (compilarea aplicației Next.js, validarea TypeScript, etc.) și lansarea în mediul de producție nu trebuie rulate manual pe serverul local.

## Cum se face Deploy-ul

Procedura de deploy este complet automatizată prin sistemul de versionare (Git). 

Pentru a lansa o nouă funcționalitate sau a aplica un fix în producție, trebuie să urmezi exclusiv acești pași:

1. **Dezvoltare și Validare Locală**
   Scrie codul, rulează eventual local `tsc` (TypeScript compiler) pentru a te asigura că nu sunt erori de sintaxă sau de tipizare.

2. **Commit Modificări**
   Creează un commit cu modificările tale folosind un mesaj clar:
   ```bash
   git add .
   git commit -m "feat: nume functionalitate noua"
   ```

3. **Push pe GitHub (Declanșarea Build-ului)**
   Trimite codul către serverul GitHub:
   ```bash
   git push origin main
   ```

   > [!IMPORTANT]
   > În momentul în care faci `push` pe branch-ul `main`, GitHub Actions va intercepta comanda și va lansa automat procesul de `build`. Orice eroare de build (Out of Memory, Erori de Sintaxă TS) va fi raportată direct în interfața GitHub la secțiunea "Actions". 

4. **Urmărirea Procesului**
   Dacă procesul de build de pe GitHub Actions trece cu succes (bifa verde), codul va fi livrat automat către mediul de producție (serverul de hosting / Vercel etc.).

## Reguli Mentale pentru Agenți / Dezvoltatori
- Când o implementare tehnică este considerată „finalizată” și verificată, trebuie întotdeauna realizat **git commit** urmat de **git push**.
- **Nu lăsa cod ne-push-at** pe mașinăria locală dacă vrei ca clientul să vadă modificările live, deoarece build-ul real se face pe baza codului de pe GitHub.
