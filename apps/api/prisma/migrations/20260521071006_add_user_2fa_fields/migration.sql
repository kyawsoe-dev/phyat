-- AlterTable
ALTER TABLE "users" ADD COLUMN     "user_2fa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_2fa_secret" TEXT;
