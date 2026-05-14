# Phyat Architecture

Phyat (ဖြတ်) is a production-oriented link management and developer platform built around a fast PostgreSQL hot path. Redis is intentionally omitted to reduce cost. Redirects use `Link.slug @unique`, which creates a PostgreSQL unique B-tree index, and the NestJS redirect service always uses Prisma `findUnique({ where: { slug } })`.

## Phases

1. Database: Prisma models for `User`, `Link`, and `Analytics`, with expiry, password hash, click counts, and unique slug indexing.
2. Backend: NestJS modules organized by Clean Architecture boundaries: interfaces, application services, infrastructure repositories, and domain helpers.
3. Frontend: Next.js App Router dashboard for creating links, setting expiration, viewing click counts, and copying QR codes.
4. Gateway: Next.js `/[slug]` route checks metadata, renders password form or expired state, and delegates final redirect to the API.
5. Platform: JWT authentication, tenant-scoped dashboard links, tier guards, hashed developer API keys, and `/api/v1/shorten`.

## Redirect Flow

1. Fetch link by `slug` via `findUnique` to hit the unique B-tree index.
2. Return `404` when absent, `410` when expired or disabled.
3. If password-protected and not verified, return metadata instructing the gateway to render a form.
4. Track click analytics asynchronously after the redirect decision.
5. Redirect with `302` by default to preserve changeability of short links.

## Platform Security

- Login uses JWT bearer tokens issued by NestJS and stored in an HTTP-only Next.js cookie.
- API keys are only shown once as `phyat_live_*`; only a SHA-256 hash is stored.
- Link listing and mutation always scopes by authenticated `userId`.
- Free users are limited to 5 links per month by `TierLimitGuard`; Pro and Developer use `maxLinks = NULL`.
- Developer integrations call `POST /api/v1/shorten` with a `PH_API_KEY` header.
