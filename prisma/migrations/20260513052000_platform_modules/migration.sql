-- CreateEnum
CREATE TYPE "TierCode" AS ENUM ('FREE', 'PRO', 'DEVELOPER');

-- CreateTable
CREATE TABLE "tiers" (
    "id" TEXT NOT NULL,
    "code" "TierCode" NOT NULL,
    "name" TEXT NOT NULL,
    "max_links" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- Seed subscription tiers.
INSERT INTO "tiers" ("id", "code", "name", "max_links")
VALUES
  ('tier_free', 'FREE', 'Free', 5),
  ('tier_pro', 'PRO', 'Pro', NULL),
  ('tier_developer', 'DEVELOPER', 'Developer', NULL);

-- User auth and tier relationship.
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
ALTER TABLE "users" ADD COLUMN "tier_id" TEXT;
UPDATE "users" SET "password_hash" = 'legacy-login-disabled', "tier_id" = 'tier_free';
ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "tier_id" SET NOT NULL;

-- Preserve existing orphaned links by assigning them to a system owner.
INSERT INTO "users" ("id", "email", "name", "password_hash", "tier_id", "createdAt", "updatedAt")
SELECT 'user_system', 'system@phyat.local', 'Phyat System', 'legacy-login-disabled', 'tier_developer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "users" WHERE "id" = 'user_system');

ALTER TABLE "links" DROP CONSTRAINT IF EXISTS "links_userId_fkey";
DROP INDEX IF EXISTS "links_userId_created_at_idx";
ALTER TABLE "links" RENAME COLUMN "userId" TO "user_id";
UPDATE "links" SET "user_id" = 'user_system' WHERE "user_id" IS NULL;
ALTER TABLE "links" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_four" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tiers_code_key" ON "tiers"("code");
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX "api_keys_user_id_created_at_idx" ON "api_keys"("user_id", "created_at");
CREATE INDEX "links_user_id_created_at_idx" ON "links"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
