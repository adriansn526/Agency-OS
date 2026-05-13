// ─── AI Copilot — Report Templates (Phase 3) ───
// Structured markdown templates that the AI fills with real data.
// Ensures consistent formatting across all generated reports.

export const reportTemplates = {

  // ────────────────────────────────────────────
  // Raport executiv complet (generate_summary_report)
  // ────────────────────────────────────────────
  executive: `# 📊 Raport Executiv — {{period}}

## 🏢 Sumar General
| Indicator | Valoare |
|---|---|
| Clienți activi | **{{totalClients}}** |
| Proiecte active | **{{activeProjects}}** |
| Lead-uri totale | **{{totalLeads}}** |
| MRR | **{{mrr}} RON** |
| Venituri totale (perioadă) | **{{totalRevenue}} RON** |
| Facturi restante | **{{overdueInvoices}}** ({{overdueAmount}} RON) |

## 📈 Tendințe
- Clienți noi (ultimele 30 zile): **{{newClients}}**
- Lead-uri noi: **{{newLeads}}**
- Rata conversie lead→client: **{{conversionRate}}%**

## ⚠️ Alerte
{{alerts}}

## 💡 Recomandări
{{recommendations}}

---
*Generat automat de AI Copilot — {{generatedAt}}*`,

  // ────────────────────────────────────────────
  // Raport cross-sursă per client
  // ────────────────────────────────────────────
  clientReport: `# 📋 Raport Client — {{clientName}}
**Perioadă:** {{period}}
**Integrări active:** {{activeIntegrations}}

---

## 💰 Google Ads
{{#if hasGoogleAds}}
| Metric | Valoare |
|---|---|
| Impressions | **{{ads.impressions}}** |
| Clicks | **{{ads.clicks}}** |
| Spend | **{{ads.spend}} RON** |
| CTR | **{{ads.ctr}}%** |
| CPC | **{{ads.cpc}} RON** |
| Conversions | **{{ads.conversions}}** |
| ROAS | **{{ads.roas}}x** |

### Top Campanii
{{ads.topCampaigns}}
{{else}}
> ⚠️ Google Ads nu este configurat pentru acest client. Adaugă Customer ID în setările clientului.
{{/if}}

---

## 🔍 SEO / Google Search Console
{{#if hasSEO}}
| Metric | Valoare |
|---|---|
| Clicks organice | **{{seo.clicks}}** |
| Impressions | **{{seo.impressions}}** |
| CTR mediu | **{{seo.ctr}}%** |
| Poziție medie | **{{seo.position}}** |

### Top Keywords
{{seo.topKeywords}}

### Top Pagini
{{seo.topPages}}
{{else}}
> ⚠️ Google Search Console nu este configurat. Adaugă GSC Site URL în setările clientului.
{{/if}}

---

## 📊 Analytics & UX (PostHog)
{{#if hasPostHog}}
| Metric | Valoare |
|---|---|
| Health Score | **{{analytics.healthScore}}/100** |
| JS Exceptions | **{{analytics.exceptions}}** |
| Rage Clicks | **{{analytics.rageClicks}}** |

### Web Vitals
| Metric | Valoare | Status |
|---|---|---|
| LCP | {{vitals.lcp}}ms | {{vitals.lcpStatus}} |
| CLS | {{vitals.cls}} | {{vitals.clsStatus}} |
| INP | {{vitals.inp}}ms | {{vitals.inpStatus}} |
| FCP | {{vitals.fcp}}ms | {{vitals.fcpStatus}} |

### Top Surse Trafic
{{analytics.trafficSources}}
{{else}}
> ⚠️ PostHog nu este configurat.
{{/if}}

---

## 📁 Date Interne
| Indicator | Valoare |
|---|---|
| Proiecte | **{{internal.projects}}** |
| Oferte | **{{internal.offers}}** |
| Facturi plătite | **{{internal.paidInvoices}}** |
| Venituri totale | **{{internal.totalRevenue}} RON** |

---

## 💡 Concluzii & Recomandări
{{conclusions}}

---
*Generat automat de AI Copilot — {{generatedAt}}*`,

  // ────────────────────────────────────────────
  // Raport Google Ads (singur)
  // ────────────────────────────────────────────
  googleAds: `# 📣 Raport Google Ads — {{clientName}}
**Perioadă:** {{period}}
**Customer ID:** {{customerId}}

## Performanță Generală
| Metric | Valoare |
|---|---|
| Impressions | **{{impressions}}** |
| Clicks | **{{clicks}}** |
| Spend | **{{spend}} RON** |
| CTR | **{{ctr}}%** |
| CPC mediu | **{{cpc}} RON** |
| Conversii | **{{conversions}}** |
| ROAS | **{{roas}}x** |
| Conv. Rate | **{{conversionRate}}%** |

## Campanii
| Campanie | Status | Spend | Clicks | Conv. | ROAS |
|---|---|---|---|---|---|
{{campaignRows}}

## Top Search Terms
| Termen | Clicks | Imp. | Cost | Conv. |
|---|---|---|---|---|
{{searchTermRows}}

## 💡 Observații
{{observations}}

---
*Generat automat de AI Copilot — {{generatedAt}}*`,

  // ────────────────────────────────────────────
  // Raport SEO
  // ────────────────────────────────────────────
  seo: `# 🔍 Raport SEO — {{clientName}}
**Perioadă:** {{period}}
**Site:** {{siteUrl}}

## Performanță Generală
| Metric | Valoare |
|---|---|
| Clicks organice | **{{clicks}}** |
| Impressions | **{{impressions}}** |
| CTR mediu | **{{ctr}}%** |
| Poziție medie | **{{position}}** |

## Top Keywords ({{totalKeywords}})
| Keyword | Clicks | Imp. | CTR | Poz. |
|---|---|---|---|---|
{{keywordRows}}

## Top Pagini ({{totalPages}})
| Pagină | Clicks | Imp. | CTR | Poz. |
|---|---|---|---|---|
{{pageRows}}

## 💡 Oportunități
{{opportunities}}

---
*Generat automat de AI Copilot — {{generatedAt}}*`,

  // ────────────────────────────────────────────
  // Raport PostHog / UX
  // ────────────────────────────────────────────
  analytics: `# 📊 Raport Analytics & UX — {{clientName}}
**Perioadă:** {{period}}

## Health Score: **{{healthScore}}/100**

## Probleme Detectate
| Tip | Număr |
|---|---|
| JS Exceptions | **{{exceptions}}** |
| Rage Clicks | **{{rageClicks}}** |
| Dead Clicks | **{{deadClicks}}** |

## Core Web Vitals
| Metric | Valoare | Status |
|---|---|---|
| LCP (Largest Contentful Paint) | {{lcp}}ms | {{lcpStatus}} |
| CLS (Cumulative Layout Shift) | {{cls}} | {{clsStatus}} |
| INP (Interaction to Next Paint) | {{inp}}ms | {{inpStatus}} |
| FCP (First Contentful Paint) | {{fcp}}ms | {{fcpStatus}} |

## Top Surse Trafic
| Sursă | Medium | Vizite | Utilizatori |
|---|---|---|---|
{{trafficRows}}

## Top Pagini
| Pagină | Vizualizări | Utilizatori |
|---|---|---|
{{pageRows}}

## 💡 Recomandări UX
{{recommendations}}

---
*Generat automat de AI Copilot — {{generatedAt}}*`,

}

// ────────────────────────────────────────────
// Template instruction for the system prompt
// ────────────────────────────────────────────

export const reportTemplateInstructions = `
## Șabloane de raportare
Când generezi rapoarte, folosește OBLIGATORIU structura de mai jos. Completează fiecare secțiune cu date reale din tools.

### Raport executiv (generate_summary_report):
- Tabel sumar cu KPIs: clienți, proiecte, MRR, venituri, restanțe
- Secțiune tendințe cu cifrele din ultimele 30 zile
- Secțiune alerte (valori anormale, restanțe mari)
- Secțiune recomandări (acțiuni concrete)

### Raport cross-sursă per client (generate_client_report):
- Secțiune Google Ads cu tabel KPIs + top campanii (dacă e configurat)
- Secțiune SEO/GSC cu keywords + pagini (dacă e configurat)
- Secțiune Analytics/PostHog cu health score + web vitals (dacă e configurat)
- Secțiune date interne (proiecte, oferte, facturi)
- Concluzii și recomandări bazate pe date

### Rapoarte individuale (Google Ads / SEO / Analytics):
- Tabel performanță generală cu metrici principale
- Tabeluri detaliate (campanii, keywords, pagini)
- Secțiune observații/oportunități bazate pe date

### Reguli formatare rapoarte:
1. Folosește ÎNTOTDEAUNA tabele markdown pentru date numerice
2. Bold (**valoare**) pe cifrele importante
3. Emoji-uri pentru secțiuni (📊 💰 🔍 📣 ⚠️ 💡)
4. Menționează perioda analizată la început
5. Încheie cu "Generat automat de AI Copilot"
6. Când o integrare lipsește, indică clar ce trebuie configurat
7. La concluzii, fii specific și acționabil (nu generic)
`
