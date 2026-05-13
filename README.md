# 🏢 Agency-OS

**All-in-one operating system for digital agencies** — CRM, project management, finance, marketing automation, client reporting, and AI copilot.

Built as a **Turborepo monorepo** with Next.js 16, Prisma, PostgreSQL, and Gemini AI.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Database Setup](#-database-setup)
- [Environment Variables](#-environment-variables)
- [Running the App](#-running-the-app)
- [Database Backup & Restore](#-database-backup--restore)
- [Deployment](#-deployment)

---

## ✨ Features

| Module | Description |
|---|---|
| **Dashboard** | Real-time KPIs, activity feed, and business overview |
| **CRM** | Client management with multi-site support and business lines |
| **Leads** | Lead pipeline with import, scoring, and conversion tracking |
| **Projects** | Project lifecycle management with retainers and milestones |
| **Offers** | Configurable offer builder with templates and delivery tracking |
| **Contracts** | Contract generation and management |
| **Finance** | Invoicing, payment tracking, and financial reporting |
| **Marketing** | Campaign automation, segments, short links, and A/B testing |
| **Communications** | Email (AWS SES), SMS, and call tracking (Telnyx) |
| **Reports** | Client reporting with Google Ads, SEO, and social media data |
| **Uptime** | Multi-domain uptime monitoring with incident tracking |
| **AI Copilot** | Context-aware assistant powered by Gemini 2.5 Flash |
| **Settings** | Business lines, service catalog, and system configuration |

---

## 🛠 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Monorepo:** [Turborepo](https://turborepo.dev/)
- **Database:** [PostgreSQL 16](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/)
- **Authentication:** [NextAuth v5](https://authjs.dev/)
- **AI:** [Google Gemini 2.5 Flash](https://ai.google.dev/)
- **Email:** [AWS SES](https://aws.amazon.com/ses/) (MIME multipart with attachments)
- **Analytics:** [PostHog](https://posthog.com/), [Google Search Console](https://search.google.com/search-console)
- **Ads:** [Google Ads API](https://developers.google.com/google-ads/api)
- **Call Tracking:** [Telnyx](https://telnyx.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Language:** TypeScript 5.9

---

## 📁 Project Structure

```
agency-os/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── app/
│       │   ├── (dashboard)/    # Protected dashboard pages
│       │   │   ├── crm/        # Client management
│       │   │   ├── projects/   # Project management
│       │   │   ├── finance/    # Invoices & payments
│       │   │   ├── marketing/  # Campaign automation
│       │   │   ├── reports/    # Client reporting
│       │   │   ├── offers/     # Offer builder
│       │   │   ├── contracts/  # Contract management
│       │   │   ├── communications/ # Email, SMS, calls
│       │   │   ├── automations/    # Workflow automation
│       │   │   └── settings/       # System settings
│       │   ├── api/            # API routes
│       │   ├── login/          # Authentication
│       │   ├── report/         # Public client report view
│       │   ├── offer/          # Public offer view
│       │   ├── contract/       # Public contract view
│       │   └── s/              # Short link redirects
│       ├── components/         # React components
│       ├── lib/                # Shared utilities
│       │   ├── ai/             # AI copilot & LLM providers
│       │   ├── integrations/   # External service clients
│       │   └── hooks/          # Custom React hooks
│       └── public/             # Static assets
├── packages/
│   ├── db/                     # Prisma schema & database client
│   ├── mock-data/              # Seed data & fixtures
│   ├── ui/                     # Shared UI components
│   ├── eslint-config/          # ESLint configurations
│   └── typescript-config/      # TypeScript configurations
├── backups/                    # Encrypted database backups
├── docker-compose.yml          # PostgreSQL container
├── turbo.json                  # Turborepo pipeline config
└── package.json                # Root workspace config
```

---

## 📦 Prerequisites

- **Node.js** >= 18 (recommended: 20+)
- **npm** >= 10
- **Docker** & **Docker Compose** (for PostgreSQL)
- **Git**

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/adriansn526/Agency-OS.git
cd Agency-OS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Generate Prisma client

```bash
cd packages/db
npx prisma generate
cd ../..
```

---

## 🗄 Database Setup

### Start PostgreSQL

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on **port 5434** with:
- Database: `agency_os`
- User: `agency_os`
- Data persisted in `./data/postgres/`

### Run migrations

```bash
cd packages/db
npx prisma db push
cd ../..
```

### Seed the database (optional)

```bash
cd packages/db
npx tsx prisma/seed.ts
cd ../..
```

### Restore from encrypted backup

If you have an encrypted backup file in `backups/`:

```bash
gpg --batch --decrypt --passphrase 'YOUR_ENCRYPTION_PASSWORD' \
  backups/agency_os_YYYY-MM-DD.sql.gz.gpg \
  | gunzip \
  | docker exec -i agency-os-postgres psql -U agency_os agency_os
```

---

## ⚙️ Environment Variables

Copy the example file and fill in your credentials:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your values. See [.env.example](apps/web/.env.example) for all available variables.

**Required for basic operation:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth session encryption key — generate with `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Set to `true` for non-Vercel deployments |

**Optional integrations:**

| Category | Variables |
|---|---|
| AWS SES (email) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_SENDER_*`, `SES_REPLY_*` |
| Google Ads | `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN` |
| Search Console | `GSC_CLIENT_EMAIL`, `GSC_PRIVATE_KEY` |
| AI Copilot | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| PostHog | `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_HOST` |
| Telnyx | `TELNYX_API_KEY` |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

---

## ▶️ Running the App

### Development mode

```bash
npm run dev
```

The web app will be available at **http://localhost:3100**

### Build for production

```bash
npm run build
```

### Start production server

```bash
cd apps/web
npm start
```

---

## 💾 Database Backup & Restore

### Create an encrypted backup

```bash
# Generate a secure password (save it!)
openssl rand -base64 32

# Export, compress, and encrypt
docker exec agency-os-postgres pg_dump -U agency_os agency_os \
  | gzip \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
    --passphrase 'YOUR_PASSWORD' \
    -o backups/agency_os_$(date +%Y-%m-%d).sql.gz.gpg
```

### Restore from backup

```bash
gpg --batch --decrypt --passphrase 'YOUR_PASSWORD' \
  backups/agency_os_YYYY-MM-DD.sql.gz.gpg \
  | gunzip \
  | docker exec -i agency-os-postgres psql -U agency_os agency_os
```

> ⚠️ **Store your encryption password separately** — never commit it to the repository.

---

## 🌐 Deployment

The app can be deployed to any platform that supports Next.js:

- **VPS / Docker**: Use `docker compose` for PostgreSQL + build and run the Next.js app
- **Vercel**: Connect the repo and configure environment variables
- **Custom**: Build with `npm run build` and run with `node apps/web/.next/standalone/server.js`

### Production checklist

- [ ] Set all required environment variables
- [ ] Run database migrations (`npx prisma db push`)
- [ ] Seed admin user (`cd apps/web && node scripts/seed-admin.js`)
- [ ] Configure reverse proxy (Traefik, Nginx, etc.)
- [ ] Set up SSL certificates
- [ ] Configure cron jobs for uptime monitoring and campaign automation
- [ ] Set up automated database backups

---

## 📄 License

Private — © AdvancedSystems. All rights reserved.
