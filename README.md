# Phyat (ဖြတ်)

A production-oriented URL shortener and link management platform built for Myanmar builders. Shorten, customize, protect, and track links with a clean dashboard and developer-ready API.

> **Phyat** (ဖြတ်) means "shorten" in Myanmar language.

## Features

- **Link Shortening** — Create short, memorable URLs with custom aliases and custom domains
- **Password Protection** — Gate links behind a password with bcryptjs hashing
- **Expiration Controls** — Set links to auto-expire on a specific date
- **QR Codes** — Auto-generated QR codes for every link with downloadable PNG images
- **Click Analytics** — Track clicks, user agents, browsers, OS, devices, referrers, IP geolocation (country, region, city)
- **UTM Builder** — Built-in UTM parameter builder for campaign tracking
- **Campaigns** — Group links into campaigns with click goals, date ranges, and aggregated stats
- **Custom Domains** — Bring your own domain with DNS verification (CNAME + TXT record)
- **Bulk Import** — Create multiple links at once via CSV-style text input
- **CSV Export** — Export your links data as a CSV file
- **Webhooks** — Subscribe to link events (created, updated, deleted, clicked) with signed payloads
- **Developer API** — Programmatic link creation via API keys (`POST /api/v1/shorten`)
- **Teams Ready** — Tiered plans with monthly usage counters and rate limiting
- **Dark Mode** — Light/dark/system theme support with FOUC prevention
- **Responsive** — Works on desktop and mobile with collapsible sidebar navigation
- **Link Gateway** — Smart redirect page with password form, 404, and expired/disabled states
- **Open Graph** — Dynamic OG image generation for shortened URLs
- **Google OAuth** — Sign in with Google using Google Identity Services (GIS)
- **Upgrade Requests** — Users request plan upgrades; admins approve/deny with notes (no Stripe)
- **Manual Invoicing** — Admins create and manage invoices; users view history in settings
- **Admin Panel** — Full admin dashboard with analytics, user/link/invoice/request CRUD, 2FA, and CSV export

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Radix UI |
| Backend | NestJS 10, Prisma ORM, PostgreSQL |
| Auth | JWT (HTTP-only cookies for web, Bearer headers for API), Google OAuth |
| QR | `qrcode` npm package (server-side generation) |
| Charts | Recharts (dashboard analytics visualizations) |
| Docs | Swagger/OpenAPI (at `/api/docs`) |
| Monorepo | npm workspaces |

## Architecture

```
phyat/
├── apps/
│   ├── api/                          # NestJS backend (port 4000)
│   │   └── src/
│   │       ├── main.ts               # Bootstrap, Swagger setup, CORS
│   │       ├── app.module.ts         # Root module imports
│   │       ├── common/
│   │       │   ├── auth/             # Guards & decorators
│   │       │   ├── prisma.service.ts # Singleton Prisma client
│   │       │   ├── rate-limit.middleware.ts  # 100 req/min per IP
│   │       │   ├── security.middleware.ts    # Security headers
│   │       │   └── exception.filter.ts       # Global error formatting
│   │       └── modules/
│   │           ├── auth/             # Registration, login, JWT, Google OAuth
│   │           ├── links/            # CRUD, redirect (/r/:slug), slug generation
│   │           ├── analytics/        # Click tracking, stats, device/referrer breakdown
│   │           ├── api-keys/         # Developer API key management
│   │           ├── subscriptions/    # Plans, tier guards, coupons (no Stripe)
│   │           ├── invoices/         # Manual invoice creation and listing
│   │           ├── upgrade-requests/ # User upgrade requests + admin approve/deny
│   │           ├── admin/            # Admin dashboard, analytics, user/link/invoice/request CRUD, 2FA
│   │           ├── qr-codes/         # QR generation, download, scan tracking
│   │           ├── campaigns/        # Campaign CRUD, link assignment, stats
│   │           ├── domains/          # Custom domain CRUD, DNS verification
│   │           └── webhooks/         # Webhook endpoints, event delivery, retry
│   └── web/                          # Next.js frontend (port 3000)
│       ├── app/
│       │   ├── layout.tsx            # Root layout with theme script
│       │   ├── page.tsx              # Landing page (hero, features, plans, footer)
│       │   ├── [slug]/               # Link redirect gateway
│       │   ├── sign-in/              # Login page
│       │   ├── sign-up/              # Registration page
│       │   ├── docs/                 # API documentation page
│       │   ├── dashboard/            # Authenticated dashboard (links, analytics, etc.)
│       │   ├── admin/                # Admin panel (dashboard, users, links, invoices, requests, tiers, analytics, settings)
│       │   └── api/                  # Next.js API route proxies to NestJS backend
│       ├── components/
│       │   ├── landing-hero-client.tsx   # Landing nav + hero + URL shortener form
│       │   ├── landing-footer.tsx        # Footer with links
│       │   ├── plans-section.tsx         # Pricing plans with billing toggle + confirmation dialog
│       │   ├── dashboard-navbar.tsx      # Dashboard top navigation
│       │   ├── dashboard-sidebar.tsx     # Collapsible sidebar with tier-gated items
│       │   ├── dashboard-trends.tsx      # Click trends line chart
│       │   ├── analytics-charts.tsx      # Device/referrer/time analytics visualizations
│       │   ├── bulk-upload-dialog.tsx    # Bulk link creation dialog
│       │   ├── theme-toggle.tsx          # Dark/light/system toggle
│       │   ├── logo.tsx                  # Phyat brand logo
│       │   └── ui/                       # Reusable UI primitives (button, input, dialog, etc.)
│       └── lib/
│           ├── auth.ts               # Token management, getUser, requireUser
│           └── utils.ts              # cn() classname merger, apiBaseUrl
├── prisma/
│   ├── schema.prisma                 # Database schema (15 models)
│   └── seed.ts                       # Tier seeding (Free/Pro/Developer)
└── docs/
    └── architecture.md               # Detailed architecture documentation
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

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | Yes |
| `API_BASE_URL` | Backend API base URL | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | API URL exposed to browser | Yes |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | Yes |
| `WEB_ORIGIN` | CORS origin for backend | Yes |
| `PUBLIC_SHORT_URL` | Public short URL base | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google sign-in |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Public Google client ID | For frontend GSI |
| `IP_GEOLOCATION_API_KEY` | API key for ipgeolocation.io | For GeoIP analytics |

4. **Run database migrations**

```bash
npm run prisma:migrate
```

5. **Generate Prisma client**

```bash
npm run prisma:generate
```

6. **(Optional) Seed tiers**

```bash
npx tsx prisma/seed.ts
```

7. **Start development servers**

```bash
# Terminal 1 — API server (port 4000)
npm run dev:api

# Terminal 2 — Web server (port 3000)
npm run dev:web
```

8. Open **http://localhost:3000** in your browser.

## API Reference

### Authentication

Phyat uses two authentication mechanisms:

- **JWT Bearer tokens** — Issued via `POST /auth/login` or `POST /auth/register`, stored in an HTTP-only cookie (`phyat_token`) for web use, or sent as `Authorization: Bearer <token>` header for API use. Tokens expire after 7 days.
- **API keys** — Prefixed `phyat_live_*`, used via `PH-API-KEY` header or `Authorization: Bearer` header. Only the SHA-256 hash is stored.

### Swagger Documentation

When the API server is running, visit:

```
http://localhost:4000/api/docs
```

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register a new user |
| POST | `/auth/login` | — | Login, returns JWT |
| POST | `/auth/google` | — | Login/register with Google OAuth idToken |
| GET | `/auth/me` | JWT | Get current user profile |
| PUT | `/auth/me` | JWT | Update profile (name) |
| POST | `/auth/change-password` | JWT | Change password |

### Link Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/links` | JWT | Create a short link |
| POST | `/links/bulk` | JWT | Bulk create links (CSV-style input) |
| GET | `/links` | JWT | List user links (cursor pagination) |
| GET | `/links/export` | JWT | Export links as CSV |
| PUT | `/links/:id` | JWT | Update a link |
| DELETE | `/links/:id` | JWT | Delete a link |
| GET | `/links/:slug/meta` | — | Get link metadata for gateway page |
| GET | `/r/:slug` | — | Resolve and redirect (302 by default) |
| POST | `/links/:slug/password` | — | Submit password for protected link |

### Analytics Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/links/:linkId` | JWT | Get click analytics |
| GET | `/analytics/links/:linkId/stats` | JWT | Get aggregated stats (total, by device, by referrer, by country, by city, over time) |

### QR Code Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/qr-codes` | JWT | List user QR codes |
| POST | `/qr-codes` | JWT | Create a QR code |
| PUT | `/qr-codes/:id` | JWT | Update a QR code |
| DELETE | `/qr-codes/:id` | JWT | Archive a QR code |
| GET | `/qr-codes/:id/download` | JWT | Download QR code PNG |
| GET | `/qr-codes/:id/scan` | — | Track QR scan + redirect |

### Campaign Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/campaigns` | JWT | Create a campaign |
| GET | `/campaigns` | JWT | List user campaigns |
| GET | `/campaigns/:id` | JWT | Get campaign details |
| PUT | `/campaigns/:id` | JWT | Update a campaign |
| DELETE | `/campaigns/:id` | JWT | Delete a campaign |
| GET | `/campaigns/:id/links` | JWT | Get links in a campaign |
| GET | `/campaigns/:id/stats` | JWT | Get campaign aggregated stats |
| POST | `/campaigns/:id/links/:linkId` | JWT | Assign a link to campaign |
| DELETE | `/campaigns/:id/links/:linkId` | JWT | Unassign a link from campaign |

### Custom Domain Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/domains` | JWT | Add a custom domain |
| GET | `/domains` | JWT | List user domains |
| POST | `/domains/:id/verify` | JWT | Verify domain (DNS TXT record check) |
| PUT | `/domains/:id/default` | JWT | Set domain as default |
| DELETE | `/domains/:id` | JWT | Remove a domain |

### API Key Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api-keys` | JWT | List API keys (last 4 chars only) |
| POST | `/api-keys` | JWT | Create a new API key (shown once) |
| DELETE | `/api-keys/:id` | JWT | Revoke an API key |

### Webhook Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/webhooks` | JWT | List webhook endpoints |
| POST | `/webhooks` | JWT | Create a webhook endpoint |
| PUT | `/webhooks/:id` | JWT | Update a webhook |
| DELETE | `/webhooks/:id` | JWT | Delete a webhook |
| POST | `/webhooks/:id/test` | JWT | Send a test event |

### Subscription & Upgrade Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/plans` | — | Get all plans with pricing |
| GET | `/subscriptions/current` | JWT | Get active subscription |
| POST | `/subscriptions/upgrade` | JWT | Switch tier (free plans only) |
| POST | `/coupons/redeem` | JWT | Validate and redeem a coupon |
| GET | `/usage/current` | JWT | Get current usage vs tier limits |
| POST | `/upgrade-requests` | JWT | Submit a plan upgrade request |
| GET | `/upgrade-requests` | JWT | Get my upgrade request history |

### Invoice Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/invoices` | JWT | List my invoices |

### Admin Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/dashboard` | Admin | Dashboard overview stats |
| GET | `/admin/health` | Admin | System health metrics |
| GET | `/admin/users` | Admin | List users with pagination |
| POST | `/admin/users` | Admin | Create a user |
| GET | `/admin/users/:id` | Admin | Get user details |
| PUT | `/admin/users/:id` | Admin | Update user (name, tier, admin) |
| DELETE | `/admin/users/:id` | Admin | Delete a user |
| GET | `/admin/users/:id/analytics` | Admin | Per-user aggregated analytics |
| GET | `/admin/links` | Admin | List all links |
| PUT | `/admin/links/:id` | Admin | Update any link |
| DELETE | `/admin/links/:id` | Admin | Delete any link |
| GET | `/admin/analytics/links/:id` | Admin | Per-link click list (admin bypass) |
| GET | `/admin/analytics/links/:id/stats` | Admin | Per-link stats (admin bypass) |
| GET | `/admin/analytics` | Admin | Aggregated platform analytics |
| GET | `/admin/analytics/export` | Admin | Export analytics as JSON (CSV-ready) |
| GET | `/admin/tiers` | Admin | List all tiers |
| PUT | `/admin/tiers/:id` | Admin | Update a tier |
| GET | `/admin/upgrade-requests` | Admin | List all upgrade requests |
| PUT | `/admin/upgrade-requests/:id/approve` | Admin | Approve a request |
| PUT | `/admin/upgrade-requests/:id/deny` | Admin | Deny a request (with note) |
| GET | `/admin/2fa/setup` | Admin | Start 2FA setup |
| POST | `/admin/2fa/verify-setup` | Admin | Verify and enable admin 2FA |
| POST | `/admin/2fa/disable` | Admin | Disable admin 2FA |

### Link Gateway Flow

1. User visits `https://phy.at/my-slug`
2. Next.js `[slug]/page.tsx` fetches metadata from `GET /links/:slug/meta`
3. If link not found → renders 404 page
4. If expired or disabled → renders 410 "Link no longer available" page
5. If password-protected and not verified → renders password form
6. Otherwise → calls `GET /r/:slug` with forwarded headers (user-agent, IP, referrer) for redirect + async analytics tracking

### Upgrade Request Flow

1. User clicks "Choose Pro" or "Upgrade to Developer" on plans page
2. Confirmation dialog appears with plan name and price
3. On confirm, `POST /api/upgrade-requests` creates a PENDING request
4. Pending banner shows with admin contact details
5. Admin reviews and approves/denies via admin panel
6. On approval, user's tier is upgraded and an invoice is auto-created
7. User sees request history (Pending/Approved/Denied with notes) in Settings → Profile

## Tier Plans

| Feature | Free | Pro ($13/mo) | Developer ($29/mo) |
|---------|------|--------------|-------------------|
| Links/month | 5 | Unlimited | Unlimited |
| QR codes/month | 5 | Unlimited | Unlimited |
| Custom domains | — | 3 | Unlimited |
| API keys | — | 2 | Unlimited |
| Webhooks | — | — | Unlimited |
| Advanced analytics | — | ✓ | ✓ |
| Bulk import | — | ✓ | ✓ |
| CSV export | — | ✓ | ✓ |
| UTM builder | — | ✓ | ✓ |
| Campaigns | — | ✓ | ✓ |
| API rate limit | — | 100/min | 600/min |

Annual billing discounts: Pro $120/yr (23% off), Developer $276/yr (21% off).

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Start NestJS API in watch mode (port 4000) |
| `npm run dev:web` | Start Next.js dev server (port 3000) |
| `npm run build` | Build both apps for production |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |

## Security

- **JWT tokens** stored in HTTP-only cookies (web) or used as Bearer headers (API)
- **Passwords** hashed with bcryptjs
- **API keys** shown once on creation; only SHA-256 hash stored in database
- **Tenant-scoped** — all link/analytics queries are scoped by authenticated `userId`
- **Tier limit guards** — Free users capped at 5 links/month via `TierLimitGuard`; Pro/Developer use `maxLinks = NULL`
- **Security headers** via NestJS `SecurityMiddleware` (HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- **Rate limiting** — 100 requests/minute per IP via in-memory `RateLimitMiddleware`
- **Google OAuth** manually verifies idToken signature using RSA-SHA256 with JWKS from Google
- **CORS** configured for `WEB_ORIGIN` (default `http://localhost:3000`)

## Frontend App Structure

### Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page (hero, features, workflow, stats, pricing, footer) |
| `/sign-in` | Login with email/password or Google |
| `/sign-up` | Registration with name, email, password |
| `/docs` | Full API documentation |
| `/[slug]` | Link redirect gateway (password form, 404, expired) |
| `/dashboard` | Dashboard home (stats cards, trends, recent links, activity) |
| `/dashboard/links` | Full link management (search, filter, create, edit, bulk, export) |
| `/dashboard/qr` | QR code listing and management |
| `/dashboard/analytics` | Click analytics overview |
| `/dashboard/campaigns` | Campaign management and link assignment |
| `/dashboard/domains` | Custom domain management |
| `/dashboard/plans` | Plan selection with confirmation dialog |
| `/dashboard/settings` | Account settings, profile, API keys, security, invoice history, upgrade request history |
| `/admin` | Admin dashboard with analytics, charts, tier distribution |
| `/admin/users` | Admin user CRUD with 2FA status, login methods, create/edit/delete dialogs |
| `/admin/links` | Admin link management with copy, status toggle, action buttons |
| `/admin/invoices` | Admin invoice management with status filter |
| `/admin/upgrade-requests` | Admin request approval/denial with status filter |
| `/admin/tiers` | Tier configuration |
| `/admin/analytics` | Platform-wide analytics |
| `/admin/settings` | Admin settings including 2FA |

### Theme System

- Uses CSS custom properties with HSL values for light (`:root`) and dark (`.dark`) modes
- Theme preference stored in `localStorage` under key `phyat-theme` (`system`/`light`/`dark`)
- Inline `<script>` in root layout prevents flash of wrong theme (FOUC)
- Tailwind configured with `darkMode: ['class']` strategy
- All elements transition smoothly with 160ms ease on color/border/shadow changes

## License

Private — All rights reserved.
