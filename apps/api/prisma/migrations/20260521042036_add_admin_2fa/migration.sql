-- AlterTable
ALTER TABLE "users" ADD COLUMN     "admin_2fa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "admin_2fa_secret" TEXT;
