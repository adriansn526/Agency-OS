# Tenant AI (billed in credits)

Remote tenants (e.g. zoana-partners.com) call these endpoints with their license key. Credits are charged per action from
`CreditPricingRule` and only for a successful answer; every call is written to `CreditUsage` with the real provider cost
(thinking tokens included).

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tenant-ai/balance` | GET | remaining credits + price list (`ai_*` rules) |
| `/api/tenant-ai/snippet` | POST | 3 alternative titles + a 155-character summary (`ai_snippet`) |
| `/api/tenant-ai/analyze` | POST | legal/SEO analysis of an article (`ai_article_analyze`, `tier: "pro"` → `ai_article_analyze_pro`) |
| `/api/tenant-ai/review` | POST | revised article + list of changes (`ai_article_review`) |
| `/api/tenant-ai/generate` | POST | new article, markdown (`ai_article_generate`) |

Header: `X-License-Key: <TenantInstance.licenseKey>`. Body (JSON, all optional except where noted): `title`, `keyword`, `topic` (generate),
`text` (analyze/review/snippet, max 60 000 chars), `words` (generate, 300-3000), `tier` (`standard` | `pro`).

Errors: 401 missing key · 403 invalid key / suspended · 402 not enough credits (`required`, `balance`) · 429 more than 20 requests/min ·
400 invalid input · 502 provider failed, answer truncated or malformed (never charged) · 500 pricing rule missing.

Models: `AI_MODEL_FLASH` (default `gemini-3.8-flash`), `AI_MODEL_LITE` (`gemini-3.1-flash-lite`, snippets), `AI_MODEL_PRO` (`gemini-3.1-pro-preview`).
The provider key is the platform's `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), independent of the key saved in Settings → Integrations.
Prices live in `lib/ai/pricing.ts` (USD per 1M tokens, dated steps; unknown models fall back to the most expensive rate).

Tests: `npx tsx --test lib/ai/__tests__/pricing.test.ts lib/tenant-ai/__tests__/service.test.ts` and, with a scratch database,
`TENANT_AI_TEST_DATABASE_URL=… npx tsx --test lib/tenant-ai/__tests__/billing.integration.test.ts`.
