-- Native Core Bitly + dynamic tier capabilities
CREATE TYPE "RedirectType" AS ENUM ('TEMPORARY', 'PERMANENT');
CREATE TYPE "QrCodeStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "AnalyticsEventType" AS ENUM ('CLICK', 'SCAN');
CREATE TYPE "WebhookEvent" AS ENUM ('LINK_CREATED', 'LINK_UPDATED', 'LINK_DELETED', 'LINK_CLICKED', 'QR_CREATED', 'QR_SCANNED');
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');
CREATE TYPE "UsageFeature" AS ENUM ('LINKS', 'QR_CODES', 'CUSTOM_DOMAINS', 'API_KEYS', 'WEBHOOKS', 'API_CALLS', 'WEBHOOK_DELIVERIES', 'EXPORTS', 'BULK_ROWS');

ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tiers"
  ADD COLUMN "max_links_per_month" INTEGER,
  ADD COLUMN "max_qr_codes_per_month" INTEGER,
  ADD COLUMN "max_custom_domains" INTEGER,
  ADD COLUMN "max_api_keys" INTEGER,
  ADD COLUMN "max_webhooks" INTEGER,
  ADD COLUMN "bulk_create_limit" INTEGER,
  ADD COLUMN "analytics_retention_days" INTEGER,
  ADD COLUMN "api_rate_limit_per_minute" INTEGER,
  ADD COLUMN "annual_discount_percent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "custom_domains" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "api_access" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "webhooks" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "advanced_analytics" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "utm_builder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "qr_customization" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bulk_import" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "export_data" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "campaigns_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "tiers" SET
  "max_links_per_month" = "max_links",
  "max_qr_codes_per_month" = CASE WHEN "code" = 'FREE' THEN 5 ELSE NULL END,
  "max_custom_domains" = CASE WHEN "code" = 'FREE' THEN 0 WHEN "code" = 'PRO' THEN 3 ELSE NULL END,
  "max_api_keys" = CASE WHEN "code" = 'FREE' THEN 0 WHEN "code" = 'PRO' THEN 2 ELSE NULL END,
  "max_webhooks" = CASE WHEN "code" = 'DEVELOPER' THEN NULL ELSE 0 END,
  "bulk_create_limit" = CASE WHEN "code" = 'FREE' THEN 0 WHEN "code" = 'PRO' THEN 100 ELSE 1000 END,
  "analytics_retention_days" = CASE WHEN "code" = 'FREE' THEN 30 WHEN "code" = 'PRO' THEN 365 ELSE NULL END,
  "api_rate_limit_per_minute" = CASE WHEN "code" = 'FREE' THEN 0 WHEN "code" = 'PRO' THEN 60 ELSE 600 END,
  "annual_discount_percent" = CASE WHEN "code" = 'PRO' THEN 23 WHEN "code" = 'DEVELOPER' THEN 21 ELSE 0 END,
  "custom_domains" = "code" <> 'FREE',
  "api_access" = "code" <> 'FREE',
  "webhooks" = "code" = 'DEVELOPER',
  "advanced_analytics" = "code" <> 'FREE',
  "utm_builder" = true,
  "qr_customization" = "code" <> 'FREE',
  "bulk_import" = "code" <> 'FREE',
  "export_data" = "code" <> 'FREE',
  "campaigns_enabled" = true,
  "sort_order" = CASE WHEN "code" = 'FREE' THEN 0 WHEN "code" = 'PRO' THEN 1 ELSE 2 END;

ALTER TABLE "links"
  ADD COLUMN "short_host" TEXT NOT NULL DEFAULT 'localhost:3000',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "utm_params" JSONB,
  ADD COLUMN "custom_params" JSONB,
  ADD COLUMN "redirect_type" "RedirectType" NOT NULL DEFAULT 'TEMPORARY',
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "scan_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "links" l
SET "short_host" = COALESCE(d."domain", regexp_replace(COALESCE(current_setting('app.public_short_url', true), 'localhost:3000'), '^https?://', ''))
FROM "links" l2
LEFT JOIN "domains" d ON d."id" = l2."domain_id"
WHERE l."id" = l2."id";

ALTER TABLE "links" DROP CONSTRAINT IF EXISTS "links_slug_key";
CREATE UNIQUE INDEX "links_short_host_slug_key" ON "links"("short_host", "slug");
CREATE INDEX "links_short_host_slug_idx" ON "links"("short_host", "slug");

CREATE TABLE "qr_codes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "link_id" TEXT NOT NULL,
  "title" TEXT,
  "design" JSONB,
  "image_format" TEXT NOT NULL DEFAULT 'png',
  "image_data_url" TEXT NOT NULL,
  "scan_count" INTEGER NOT NULL DEFAULT 0,
  "status" "QrCodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qr_codes_user_id_created_at_idx" ON "qr_codes"("user_id", "created_at");
CREATE INDEX "qr_codes_link_id_idx" ON "qr_codes"("link_id");
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "qr_codes" ("id", "user_id", "link_id", "title", "image_data_url", "created_at", "updated_at")
SELECT 'qr_' || "id", "user_id", "id", "title", "qr_code_data_url", "created_at", "updated_at"
FROM "links"
WHERE "qr_code_data_url" IS NOT NULL;

CREATE TABLE "webhook_endpoints" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" "WebhookEvent"[] NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "webhook_endpoints_user_id_created_at_idx" ON "webhook_endpoints"("user_id", "created_at");
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "webhook_deliveries" (
  "id" TEXT NOT NULL,
  "endpoint_id" TEXT NOT NULL,
  "event" "WebhookEvent" NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "delivered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "webhook_deliveries_endpoint_id_created_at_idx" ON "webhook_deliveries"("endpoint_id", "created_at");
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "usage_counters" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "tier_id" TEXT NOT NULL,
  "feature" "UsageFeature" NOT NULL,
  "month" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usage_counters_user_id_feature_month_key" ON "usage_counters"("user_id", "feature", "month");
CREATE INDEX "usage_counters_tier_id_idx" ON "usage_counters"("tier_id");
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "analytics"
  ADD COLUMN "event_type" "AnalyticsEventType" NOT NULL DEFAULT 'CLICK',
  ADD COLUMN "browser" TEXT,
  ADD COLUMN "os" TEXT,
  ADD COLUMN "device" TEXT,
  ADD COLUMN "referrer_domain" TEXT;
