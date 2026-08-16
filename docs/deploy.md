# Ghid de Deployment - Agency OS

Acest document descrie modul în care platforma Agency OS este actualizată și deployată pe serverul de producție (VPS).

## 1. Fluxul Standard (Recomandat)

Platforma folosește **GitHub Actions** (CI/CD) pentru deployment automat.

**Pașii pentru un deploy standard:**
1. Faci modificările în cod local, pe laptopul/PC-ul tău.
2. Faci commit și push către branch-ul `main` pe GitHub.
3. GitHub Actions pornește automat un workflow (definit în `.github/workflows/deploy.yml`):
   - Face checkout la noul cod.
   - Rulează `npm install` și construiește varianta optimizată de Next.js (`npm run build`).
   - Copiază prin SCP fișierele finale (folderul `.next/standalone`, `.next/static` și `public`) pe serverul de producție în `/home/asns/projects/AdvancedSystems/agency-os/deploy_temp`.
   - Mută fișierele în folderul live al aplicației și restartează automat serviciul (`sudo systemctl restart agency-os`).

*Observație:* Acesta este motivul pentru care folderul tău de producție `/home/asns/projects/AdvancedSystems/agency-os` **nu este un repository Git**. El este o destinație în care sunt "aruncate" doar fișierele compilate gata de rulare.

---

## 2. Fluxul de Hotfix (Cum s-au făcut modificările pe server)

Când facem reparații rapide (hotfixes) direct pe serverul de producție, trebuie să ne asigurăm că aplicăm modificările imediat, dar le trimitem și înapoi pe GitHub, pentru ca următorul deploy standard să nu ne șteargă munca.

**Pașii făcuți de asistent pentru hotfix-ul de WhatsApp:**
1. **Modificarea codului live:** Am modificat fișierele direct în `/home/asns/projects/AdvancedSystems/agency-os/apps/web/...`.
2. **Recompilarea:** Am rulat scriptul local de build (`build_and_deploy.sh`) ca serverul să preia noile modificări și am dat restart aplicației din systemctl.
3. **Sincronizarea cu Git (Commit & Push):** 
   - Deoarece folderul aplicației nu e repo Git, m-am folosit de o clonă a repository-ului aflată temporar în `/tmp/Agency-OS-Repo`.
   - Am făcut un mic script de bash care:
     - A copiat fișierele modificate (ex. `route.ts`) din producție în `/tmp/Agency-OS-Repo`.
     - A rulat `git add`, `git commit` și `git push origin main` direct din acel folder.

Astfel, producția a fost fixată instant, iar GitHub a primit codul nou, rămânând sincronizat pentru viitoarele actualizări!

## Comenzi Utile pe Server

- **Status Server:** `sudo systemctl status agency-os`
- **Restart Server:** `sudo systemctl restart agency-os`
- **Log-uri Aplicație (Next.js):** `journalctl -u agency-os.service -f`
- **Log-uri OpenWA:** `pm2 logs openwa`
- **Recompilare manuală locală:** Rularea scriptului `/home/asns/projects/AdvancedSystems/agency-os/build_and_deploy.sh`
