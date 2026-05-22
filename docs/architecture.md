# Phyat Architecture

Phyat (ဖြတ်) is a production-oriented link management and developer platform built around a fast PostgreSQL hot path. Redis is intentionally omitted to reduce cost. Redirects use `Link.slug @unique` (scoped per `shortHost`), which creates a PostgreSQL unique B-tree index, and the NestJS redirect service always uses Prisma `findUnique({ where: { slug, shortHost } })`.

Billing is **manual** — there is no Stripe integration. Users request tier upgrades via the plans page, and admins approve/deny those requests. Invoices are created automatically on approval and displayed in user settings.

## Project Structure

```
phyat/
├── apps/
│   ├── api/                     # NestJS 10 backend — REST API + Swagger
│   │   └── src/
│   │       ├── main.ts          # Bootstrap (CORS, Swagger, ValidationPipe, middleware)
│   │       ├── app.module.ts    # Root module — imports all feature modules
│   │       ├── common/
│   │       │   ├── auth/
│   │       │   │   ├── admin.guard.ts            # Admin role guard (user.isAdmin)
│   │       │   │   ├── jwt-auth.guard.ts          # JWT Bearer token verification
│   │       │   │   └── current-user.decorator.ts  # @CurrentUser() param decorator
│   │       │   ├── prisma.service.ts              # Singleton PrismaClient
│   │       │   ├── rate-limit.middleware.ts        # In-memory sliding window (100 req/min/IP)
│   │       │   ├── security.middleware.ts          # Security headers (HSTS, CSP, XFO, etc.)
│   │       │   └── exception.filter.ts            # Global exception formatting
│   │       └── modules/
│   │           ├── auth/           # User registration, login, JWT issuance, Google OAuth
│   │           ├── links/          # Link CRUD, bulk, redirect (/r/:slug), slug generation
│   │           ├── analytics/      # Click event tracking, aggregated stats, device/referrer/geo
│   │           ├── api-keys/       # Developer API key CRUD (SHA-256 hashed, last-four display)
│   │           ├── subscriptions/  # Tier plans, usage counters, coupons, tier switching
│   │           ├── invoices/       # Manual invoice creation & user listing
│   │           ├── upgrade-requests/ # User upgrade requests + admin approve/deny workflow
│   │           ├── admin/          # Admin dashboard, analytics, user/link/invoice/request CRUD, 2FA, CSV export
│   │           ├── qr-codes/       # QR code generation (qrcode lib), download, scan tracking
│   │           ├── campaigns/      # Campaign grouping, link assignment, aggregated campaign stats
│   │           ├── domains/        # Custom domain add/verify/delete, DNS verification
│   │           └── webhooks/       # Webhook endpoint management, event dispatch, delivery logging
│   └── web/                     # Next.js 14 App Router frontend
│       ├── app/
│       │   ├── layout.tsx       # Root layout — Inter font, theme FOUC script
│       │   ├── page.tsx         # Landing page (server-rendered, getCurrentUser, plans-section)
│       │   ├── [slug]/page.tsx  # Link gateway — resolves metadata, password form, redirect
│       │   ├── sign-in/         # Login with email/password + Google OAuth
│       │   ├── sign-up/         # Registration with optional tier param
│       │   ├── docs/            # Full API documentation page
│       │   ├── dashboard/       # Authenticated app shell + feature pages
│       │   ├── admin/           # Admin panel — dashboard, users, links, invoices, requests, tiers, analytics, settings
│       │   └── api/             # Next.js route handlers (proxies to NestJS backend)
│       ├── components/
│       │   ├── landing-hero-client.tsx  # Fixed navbar, hero section, URL shortener form
│       │   ├── landing-footer.tsx       # Footer with product/resource/company links
│       │   ├── plans-section.tsx        # Pricing plans with billing toggle + upgrade confirmation dialog
│       │   ├── dashboard-navbar.tsx     # Top bar with user dropdown
│       │   ├── dashboard-sidebar.tsx    # Collapsible sidebar with tier-gated items
│       │   ├── dashboard-trends.tsx     # Click trends Recharts line chart
│       │   ├── analytics-charts.tsx     # Pie/line/bar charts for analytics
│       │   ├── bulk-upload-dialog.tsx   # CSV-style bulk link creation dialog
│       │   ├── theme-toggle.tsx         # Dark/light/system theme switcher
│       │   ├── logo.tsx                 # Phyat brand logo
│       │   └── ui/                      # Button, Input, Dialog, PasswordInput, Loading
│       └── lib/
│           ├── auth.ts          # Token management (httpOnly cookie), getCurrentUser, requireUser
│           └── utils.ts         # cn() classname merger, apiBaseUrl
├── prisma/
│   ├── schema.prisma            # 15 models, 12 enums
│   └── seed.ts                  # Tiers (FREE/PRO/DEVELOPER) + coupon (SAVE20)
└── docs/
    └── architecture.md          # This file
```

## Database Schema

15 models with enums for status, events, and feature tracking.

### Core Models

| Model | Description | Key Fields |
|-------|-------------|-----------|
| `User` | User account with auth and tier binding | `email` (unique), `passwordHash`, `googleId` (unique), `tierId`, `isAdmin` |
| `Tier` | Subscription tier definition with all limits | `code` (FREE/PRO/DEVELOPER), `maxLinks`, `priceMonthly`, feature booleans |
| `Link` | Short link record | `slug` + `shortHost` (unique), `destination`, `passwordHash`, `expiresAt`, `clickCount`, `redirectType` |
| `Domain` | Custom domain per user | `domain` (unique), `verified`, `verificationToken`, `isDefault` |
| `Campaign` | Link grouping with goals | `name`, `clickGoal`, `startDate`, `endDate` |
| `ApiKey` | Developer API key | `keyHash` (SHA-256, unique), `prefix`, `lastFour`, `revokedAt` |
| `QrCode` | QR code linked to a link | `imageDataUrl`, `design` (JSON), `scanCount`, `status` |
| `WebhookEndpoint` | Webhook subscriber | `url`, `secret`, `events` (WebhookEvent[]), `isActive` |
| `WebhookDelivery` | Webhook delivery log | `event`, `payload` (JSON), `status`, `attempts`, `lastError` |
| `UsageCounter` | Monthly per-feature usage | `userId` + `feature` + `month` (unique), `count` |
| `Subscription` | User subscription record | `tierId`, `status`, `billingCycle` |
| `Coupon` | Discount coupon | `code` (unique), `discountPercent`, `maxUses`, `expiresAt` |
| `CouponRedemption` | Coupon usage record | `couponId` + `userId` (unique) |
| `Invoice` | Manual invoice for upgrades | `userId`, `amount`, `description`, `status` (PENDING/PAID), `issuedAt`, `paidAt` |
| `UpgradeRequest` | Tier upgrade request | `userId`, `requestedTierId`, `status` (PENDING/APPROVED/DENIED), `adminNote` |
| `Analytics` | Click/scan event log | `eventType`, `userAgent`, `browser`, `os`, `device`, `referrer`, `ip`, `country`, `region`, `city`, `clickedAt` |

### Key Indexes

- `Link`: `@@unique([shortHost, slug])` — composite unique for tenant-scoped slugs
- `Link`: `@@index([userId, createdAt])` — fast user link listing
- `Link`: `@@index([expiresAt])` — expiry sweep queries
- `Analytics`: `@@index([linkId, clickedAt])` — per-link time-range analytics
- `UsageCounter`: `@@unique([userId, feature, month])` — upsertable monthly counters
- `Invoice`: `@@index([userId])`, `@@index([status])`
- `UpgradeRequest`: `@@index([userId])`, `@@index([status])`

### Enums

| Enum | Values |
|------|--------|
| `LinkStatus` | `ACTIVE`, `DISABLED` |
| `TierCode` | `FREE`, `PRO`, `DEVELOPER` |
| `BillingCycle` | `MONTHLY`, `ANNUAL` |
| `SubscriptionStatus` | `ACTIVE`, `CANCELED`, `EXPIRED` |
| `RedirectType` | `TEMPORARY` (302), `PERMANENT` (301) |
| `QrCodeStatus` | `ACTIVE`, `ARCHIVED` |
| `AnalyticsEventType` | `CLICK`, `SCAN` |
| `WebhookEvent` | `LINK_CREATED`, `LINK_UPDATED`, `LINK_DELETED`, `LINK_CLICKED`, `QR_CREATED`, `QR_SCANNED` |
| `WebhookDeliveryStatus` | `PENDING`, `DELIVERED`, `FAILED` |
| `UsageFeature` | `LINKS`, `QR_CODES`, `CUSTOM_DOMAINS`, `API_KEYS`, `WEBHOOKS`, `API_CALLS`, `WEBHOOK_DELIVERIES`, `EXPORTS`, `BULK_ROWS` |
| `RequestStatus` | `PENDING`, `APPROVED`, `DENIED` |
| `InvoiceStatus` | `PENDING`, `PAID` |

## Redirect Flow

1. User visits `https://phy.at/{slug}` or custom domain
2. Next.js `[slug]/page.tsx` server component fetches metadata from `GET /links/:slug/meta`
3. Backend resolves via `PrismaService.link.findUnique({ where: { shortHost_slug: { shortHost, slug } } })` hitting the unique composite B-tree index
4. If link not found → return 404, gateway renders "Link not found" page
5. If expired or disabled (status ≠ ACTIVE) → return 410, gateway renders "Link no longer available" page
6. If password-protected and session has not verified password → return metadata instructing gateway to render `<PasswordForm>`
7. If password already verified (session cookie) or no password → gateway calls `GET /r/:slug`
8. Backend tracks analytics **asynchronously** (fire-and-forget after sending redirect response): parses `User-Agent` via `ua-parser-js`, looks up GeoIP via `ipgeolocation.io`, logs to `Analytics` table
9. Backend responds with `302 Found` (temporary redirect by default) to preserve changeability of short links; permanent `301` available as `RedirectType.PERMANENT`

## Upgrade Request Flow

1. User browses plans on the landing page (`plans-section.tsx`) or dashboard plans page
2. Clicking "Choose Pro" / "Upgrade to Developer" opens a confirmation dialog showing plan name and price
3. On confirm, `POST /api/upgrade-requests` creates a `PENDING` request in the database
4. A pending banner displays with admin contact information (phone + email)
5. Multiple requests are prevented — only one PENDING request allowed per user
6. Admin views all requests via admin panel (`GET admin/upgrade-requests`)
7. Admin can **approve** (upgrades user tier, auto-creates invoice) or **deny** (with optional note)
8. On approval, `SubscriptionsService.applyTier()` updates the user's tier and an invoice is created via `InvoiceService.createInvoice()`
9. User can view the full request history (status plan name, date, admin note) in **Settings → Profile → Upgrade Request History**

## Invoice Flow

1. Invoices are created **only** by the system when an admin approves an upgrade request for a paid tier
2. `InvoiceService.createInvoice()` stores the user ID, amount (monthly price), description, and `PENDING` status
3. Admin can list and filter invoices (PENDING/PAID) in the admin panel
4. User views their invoice history in **Settings → Profile → Invoice History**
5. (Future: manual mark-as-paid by admin)

## Authentication & Authorization

### Three Authentication Mechanisms

**1. JWT Bearer Tokens (Web UI)**

- Issued by `AuthService.login()` / `AuthService.register()` / `AuthService.googleLogin()`
- Signed via `@nestjs/jwt` with `JWT_SECRET`, 7-day expiry
- Front end stores token in httpOnly cookie (`phyat_token`) via `setToken()`
- Cookie config: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` (production), `path: '/'`, `maxAge: 604800` (7 days)
- `JwtAuthGuard` reads `Authorization: Bearer <token>` header, verifies JWT, loads user from database (fails if user deleted or tier changed)
- Server components use `getCurrentUser()` or `requireUser()` from `lib/auth.ts`
- Sign-out: `POST /api/auth/signout` → `cookies().delete('phyat_token')`

**2. Google OAuth**

- Frontend renders Google One Tap button via Google Identity Services (GIS) when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set
- Backend `AuthService.googleLogin()` manually verifies the Google ID token:
  1. Decodes JWT header and payload
  2. Validates `aud` (client ID), `iss` (accounts.google.com), `exp`, `email_verified`
  3. Fetches Google JWKS from `https://www.googleapis.com/oauth2/v3/certs`
  4. Verifies RSA-SHA256 signature using Node.js `crypto.verify()`
- On success, finds user by `googleId` or `email`, creates if not found, issues JWT

**3. API Keys (Developer API)**

- Keys are prefixed `phyat_live_` with 48+ characters of entropy
- Only SHA-256 hash stored in `ApiKey.keyHash`; full key shown once at creation
- `ApiKeyGuard` reads `ph-api-key` header or `Authorization: Bearer <key>` header
- `WebhookAuthGuard` accepts both JWT and API key (dual-auth for webhook management)

### Authorization

- **Tenant isolation**: All repository methods scope queries by `userId` extracted from JWT payload
- **Tier limits**: `TierLimitGuard` checks `UsageCounter` before allowing link/QR creation; Free users limited to 5/month; `TierCapabilityService` resolves feature flags from user's tier
- **Admin routes**: `AdminGuard` checks `user.isAdmin === true` for admin endpoints

## Module Architecture

Each feature module follows Clean Architecture boundaries inside `modules/<name>/`:

```
modules/<name>/
├── interfaces/       # Controllers (HTTP layer), DTOs, Swagger decorators
├── application/      # Service classes (business logic, use cases)
├── infrastructure/   # Repository implementations (Prisma queries)
└── domain/           # Domain models, policies, value objects (if applicable)
```

### Auth Module

- `AuthService` — register, login, googleLogin, changePassword, me (returns user + tier + admin2faEnabled)
- Passwords hashed with `bcryptjs` (10 salt rounds)
- `AuthController` — exposes `/auth/*` endpoints
- `JwtAuthGuard` — verifies JWT and populates `request.user`

### Links Module

- `LinksService` — create, update, delete, bulk create, list with cursor pagination, CSV export
- `RedirectService` — resolve slug, check expiry/status, track analytics async, redirect
- `SlugService` — generates unique 6-character alphanumeric slugs (re-rolls on collision)
- `LinkPolicy` — domain rules for link creation (validates destination URL format, slug constraints)
- `LinkRepository` — all Prisma link queries with tenant scoping
- `TierLimitGuard` — checks monthly usage before create/bulk operations
- Shorten API controller at `/api/v1/shorten` — same logic but auth via API key

### Analytics Module

- `AnalyticsService` — processes click events, parses user-agent (browser, OS, device), resolves GeoIP (country, region, city), logs to Analytics table
- `AnalyticsRepository` — query with time-range filtering, aggregation (group by device/browser/referrer/country/city)
- Stats endpoint returns: total clicks, unique devices, browser breakdown, OS breakdown, device types, referrer domains, top countries, top cities, clicks over time (daily buckets)

### Subscriptions Module

- `SubscriptionsService` — applyTier, switch free plans, manage subscription lifecycle
- `TierCapabilityService` — evaluates feature availability from user's tier
- `UsageService` — increment monthly counters, evaluate limits, report current usage vs tier caps
- `CouponRepository` — validate coupon code, check expiry and usage limits
- Dynamic tier admin endpoints for updating tiers

### Invoices Module

- `InvoiceService` — createInvoice (called by upgrade-requests on approval), getUserInvoices
- `InvoiceController` — `GET /invoices` for users, admin endpoints for listing all invoices

### Upgrade Requests Module

- `UpgradeRequestsService` — create (validates tier exists, checks duplicate PENDING), getUserRequests, getAllRequests (admin), approve (upgrades tier + creates invoice), deny (with optional adminNote)
- `UpgradeRequestsController` — `POST /upgrade-requests`, `GET /upgrade-requests`, `GET admin/upgrade-requests`, `PUT .../approve`, `PUT .../deny`

### Admin Module

- `AdminService` — comprehensive admin operations:
  - `getDashboardStats()` — total users, links, clicks, tier distribution, recent users, top links, unique IPs, monthly growth, clicks over time (daily bucketed for chart)
  - `getSystemHealth()` — real analytics from the last hour (clicks, scans, active users, unique IPs, links created)
  - `getUsers()` — paginated user list with tier info, 2FA status, login method (hasGoogle/hasPassword), admin2faEnabled
  - `createUser()` — create user with email/name/password/tier/admin
  - `getUserDetail()`, `updateUser()`, `deleteUser()`
  - `getAllLinks()`, `updateLink()`, `deleteLinkById()`
  - `getUserAnalytics()` — per-user aggregated stats (total clicks, by link, by device, by country, by browser, by referrer, over time)
  - `getLinkAnalytics()` — per-link click list (admin bypass with pagination)
  - `getLinkAnalyticsStats()` — per-link stats (admin bypass: total, device, browser, referrer, country, city, time series)
  - `getAdminAnalytics()` — platform-wide analytics (daily series, country breakdown, referrer breakdown, active users, unique IPs)
  - `exportAnalytics()` — full JSON export of analytics data (CSV-ready)
  - `getTiers()`, `updateTier()`
- `Admin2faService` — TOTP-based 2FA for admin accounts (setup, verify, disable)
- `AdminController` — all `GET/POST/PUT/DELETE /admin/*` endpoints

### QR Codes Module

- `QrCodesService` — generates QR codes server-side using `qrcode` npm package (as PNG data URL), supports customization (colors, sizes via `design` JSON field)
- Download endpoint serves the image data with appropriate content-type
- Scan endpoint tracks QR scans as `AnalyticsEventType.SCAN`

### Campaigns Module

- `CampaignsService` — CRUD for campaigns, link assignment/unassignment
- Aggregated campaign stats: total clicks across all campaign links, per-link breakdown, goal progress
- Campaigns can have optional date ranges and click goals

### Domains Module

- `DomainsService` — add domain with generated `verificationToken` (DNS TXT record), verify via DNS lookup, set as default, remove
- Verification requires user to add a DNS TXT record with the verification token before calling verify endpoint

### Webhooks Module

- `WebhookService` — manage webhook endpoints per user, sign payloads with HMAC-SHA256 using per-endpoint secret
- Dispatches events asynchronously on: `LINK_CREATED`, `LINK_UPDATED`, `LINK_DELETED`, `LINK_CLICKED`, `QR_CREATED`, `QR_SCANNED`
- `WebhookDelivery` records maintain delivery status with retry tracking (3 attempts with backoff)
- `WebhookAuthGuard` — authenticates via either JWT or API key

## Frontend Architecture

### App Structure

The frontend uses Next.js 14 **App Router** with a mix of server and client components:

- **Server components** (default) handle data fetching via `lib/auth.ts` and pass user/tier data as props to client components
- **Client components** (marked with `'use client'`) handle interactivity: forms, modals, charts, theme toggling, dropdowns
- **Server actions** (`'use server'`) handle form submissions: sign in, sign up, create/edit/delete links, bulk operations, CRUD for all entities

### Data Flow

```
Browser → Next.js Route (Server Component)
  → getCurrentUser() or requireUser()
  → fetches data from NestJS API via fetch() with authHeaders()
  → renders page with data passed as props to Client Components
  → Client Components call Server Actions for mutations
  → Server Actions POST to NestJS API, then revalidatePath()
```

### Admin Panel Pages

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard — stat cards, clicks chart (7d/30d/90d), tier distribution with progress bars, today's activity, most active users, top links, recent users |
| `/admin/login` | Admin login (email + password) |
| `/admin/2fa/setup` | TOTP setup for admin 2FA |
| `/admin/2fa/verify` | TOTP verification for admin login |
| `/admin/users` | Full CRUD — create/edit/delete dialogs, 2FA columns (user + admin), login method, client-side search |
| `/admin/links` | Link listing — copy button, icon-only actions (analytics, edit, toggle, delete), status badges, client-side search |
| `/admin/invoices` | Manual invoices — status dropdown filter, client-side search |
| `/admin/upgrade-requests` | Request management — approve/deny, status dropdown filter |
| `/admin/tiers` | Tier configuration |
| `/admin/analytics` | Platform-wide analytics |
| `/admin/settings` | Admin 2FA enable/disable |

### Auth Management

Auth is entirely server-side via httpOnly cookies:
- No React Context or provider for auth
- `getCurrentUser()` reads `phyat_token` cookie, calls `GET /auth/me`
- `requireUser()` same but redirects to `/sign-in` on failure
- Client components receive `user` as props from server components
- Sign-in/sign-up server actions store the JWT in the httpOnly cookie

### Theme System

1. **CSS Custom Properties** — HSL values in `:root` (light) and `.dark` (dark) selectors
2. **Storage** — `localStorage` key `phyat-theme` with values `'system'`, `'light'`, `'dark'`
3. **FOUC Prevention** — Inline `<script>` in root `layout.tsx` evaluates before first paint
4. **Toggle** — `ThemeToggle` component cycles system → light → dark, updates class and storage
5. **System Sync** — Listens for `(prefers-color-scheme: dark)` media query changes in system mode

### Route Protection

- **Dashboard**: `app/dashboard/layout.tsx` calls `requireUser()` — redirects to `/sign-in` if unauthenticated
- **Admin panel**: `app/admin/(main)/layout.tsx` calls `requireUser()` + checks `isAdmin` — redirects if not admin
- **Tier-gated features**: Server components check `user.tier.*` booleans (e.g., `customDomains`, `advancedAnalytics`) and render `<UpgradeRequired>` if feature not available
- **Dashboard sidebar**: Lock icons on tier-gated nav items, linking to plans page

## Platform Security

- **JWT tokens** stored in HTTP-only cookies (web) or used as Bearer headers (API) — not accessible from JavaScript
- **Passwords** hashed with bcryptjs (10 salt rounds) — never stored in plaintext
- **API keys** shown exactly once on creation with `phyat_live_` prefix; only SHA-256 hash stored
- **Tenant-scoped access** — all `Link`, `Analytics`, `ApiKey`, `Campaign`, `Domain`, `WebhookEndpoint`, and `QrCode` queries are scoped by authenticated `userId`
- **Tier limit guards** — `TierLimitGuard` intercepts link/QR creation; `TierCapabilityService` enforces feature availability
- **Monthly usage counters** — upserted per `[userId, feature, month]`; checked before mutation operations
- **Security middleware** (global NestJS middleware):
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production only)
- **Rate limiting** — 100 requests/minute per IP via `RateLimitMiddleware` (in-memory sliding window)
  - Keyed by `IP + HTTP method + route path`
  - Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
  - Returns `429 Too Many Requests` with `Retry-After` header when exceeded
- **Google OAuth** verifies idToken using fetched JWKS and RSA-SHA256 signature verification
- **CORS** configured for `WEB_ORIGIN` env var (default `http://localhost:3000`)
- **Global exception filter** — catches all unhandled exceptions, logs, returns consistent JSON error format
- **Password-protected links** — password verified via `POST /links/:slug/password`, result cached in session

## Rate Limiting

- **Global**: 100 requests/minute per IP (all routes)
- **API rate limit override**: Set per tier via `Tier.apiRateLimitPerMinute` (Developer tier: 600/min)
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **429 response**: `Retry-After` header with seconds until reset

## Phases

1. **Database**: Prisma models for `User`, `Tier`, `Link`, `Analytics`, `Domain`, `Campaign`, `ApiKey`, `QrCode`, `WebhookEndpoint`, `WebhookDelivery`, `UsageCounter`, `Subscription`, `Coupon`, `CouponRedemption`, `Invoice`, `UpgradeRequest` — 15 models with expiry tracking, password hashing, click/scan counts, unique slug indexing, monthly usage counters, upgrade request workflow, and manual invoice tracking.

2. **Backend**: NestJS modules organized by Clean Architecture boundaries — interfaces (controllers), application services (use cases), infrastructure (Prisma repositories), and domain (policies/value objects). Swagger/OpenAPI auto-generated at `/api/docs`. Admin module provides platform-wide analytics, user/link/invoice/request CRUD, and CSV export.

3. **Frontend**: Next.js App Router dashboard for creating links, managing campaigns, viewing analytics charts, editing QR codes, configuring custom domains and webhooks, managing subscriptions, and viewing API keys. Admin panel for platform management with full CRUD dialogs and analytics visualizations.

4. **Gateway**: Next.js `/[slug]` route server-renders metadata from API, renders password form for protected links or expired/disabled state, and delegates final redirect to NestJS `/r/:slug` with analytics tracking.

5. **Platform**: JWT authentication (httpOnly cookies), tenant-scoped dashboard, tier guards with monthly usage counters, API keys (SHA-256 hashed), manual upgrade requests with admin approval, auto-invoicing on approval, and webhook event dispatch.

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Set up database
npm run prisma:migrate
npm run prisma:generate
npx tsx prisma/seed.ts  # Optional: seed tiers + coupons

# Start API (port 4000)
npm run dev:api

# Start web (port 3000)
npm run dev:web
```

### Environment Variables

Required variables are documented in `.env.example`. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (min 32 characters)
- `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` — API endpoints
- `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth
- `IP_GEOLOCATION_API_KEY` — GeoIP lookups for analytics
