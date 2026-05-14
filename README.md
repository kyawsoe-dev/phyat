# Phyat (ဖြတ်)

A production-oriented URL shortener and link management platform built for Myanmar builders. Shorten, customize, protect, and track links with a clean dashboard and developer-ready API.

> **Phyat** (ဖြတ်) means "shorten" in Myanmar language.

## Features

- **Link Shortening** — Create short, memorable URLs with custom aliases
- **Password Protection** — Gate links behind a password
- **Expiration Controls** — Set links to auto-expire on a date
- **QR Codes** — Auto-generated QR codes for every link
- **Click Analytics** — Track clicks, user agents, referrers, and geo-location
- **Developer API** — Programmatic link creation via API keys
- **Tiered Plans** — Free (5 links/month), Pro (unlimited), Developer (API-first)
- **Dark Mode** — Light/dark/system theme support
- **Responsive** — Works on desktop and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend | NestJS 10, Prisma, PostgreSQL |
| Auth | JWT (HTTP-only cookies for web, API keys for developers) |
| Docs | Swagger/OpenAPI (at `/api/docs`) |
| Monorepo | npm workspaces |

## Architecture

```
phyat/
├── apps/
│   ├── api/          # NestJS backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/        # Registration, login, JWT issuance
│   │       │   ├── links/       # CRUD, redirect, slug generation
│   │       │   ├── analytics/   # Click tracking and stats
│   │       │   ├── api-keys/    # Developer API key management
│   │       │   └── subscriptions/
│   │       └── common/          # Guards, middleware, Prisma service
│   └── web/          # Next.js frontend
│       ├── app/
│       │   ├── dashboard/       # Authenticated dashboard pages
│       │   ├── sign-in/         # Login page
│       │   ├── sign-up/         # Registration page
│       │   ├── [slug]/          # Public redirect gateway
│       │   └── layout.tsx       # Root layout with theme script
│       └── components/         # React components (navbar, sidebar, etc.)
├── prisma/
│   └── schema.prisma           # Database schema
└── docs/
    └── architecture.md          # Detailed architecture docs
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL running locally

### Setup

1. **Clone the repository**

```bash
git clone <repo-url>
cd phyat
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/phyat` |
| `API_BASE_URL` | API server URL | `http://localhost:4000` |
| `NEXT_PUBLIC_API_BASE_URL` | API URL exposed to browser | `http://localhost:4000` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3000` |
| `PUBLIC_SHORT_URL` | Public short URL base | `http://localhost:3000` |
| `JWT_SECRET` | Secret for signing JWT tokens | *(set a long random value)* |

4. **Run database migrations**

```bash
npm run prisma:migrate
```

5. **Generate Prisma client**

```bash
npm run prisma:generate
```

6. **Start development servers**

```bash
# Terminal 1 — API server (port 4000)
npm run dev:api

# Terminal 2 — Web server (port 3000)
npm run dev:web
```

7. Open **http://localhost:3000** in your browser.

## API

### Swagger Documentation

When the API server is running, visit:
```
http://localhost:4000/api/docs
```

### Key Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/auth/me` | JWT | Get current user profile |
| POST | `/links` | JWT | Create a short link |
| GET | `/links` | JWT | List user's links |
| PUT | `/links/:id` | JWT | Update a link |
| DELETE | `/links/:id` | JWT | Delete a link |
| GET | `/links/:slug/meta` | — | Get link metadata |
| GET | `/r/:slug` | — | Redirect to destination |
| POST | `/links/:slug/password` | — | Submit password for protected link |
| POST | `/api/v1/shorten` | API Key | Programmatic link creation |
| GET | `/analytics/links/:linkId` | JWT | Get click analytics |
| GET | `/analytics/links/:linkId/stats` | JWT | Get aggregated stats |
| GET | `/api-keys` | JWT | List API keys |
| POST | `/api-keys` | JWT | Create API key |

### Developer API

```bash
curl -X POST http://localhost:4000/api/v1/shorten \
  -H "PH-API-KEY: phyat_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "https://example.com/very-long-page",
    "customAlias": "my-link",
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Start API in watch mode |
| `npm run dev:web` | Start Next.js dev server |
| `npm run build` | Build both apps |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |

## Security

- JWT tokens stored in HTTP-only cookies (web) or used as Bearer headers (API)
- Passwords hashed with bcryptjs
- API keys shown once on creation; only SHA-256 hash stored
- Tenant-scoped access — users only see their own links
- Tier limit guards — Free users capped at 5 links/month
- Security headers via middleware (HSTS, X-Frame-Options, etc.)
- Rate limiting — 100 requests/minute per IP

## License

Private — All rights reserved.
