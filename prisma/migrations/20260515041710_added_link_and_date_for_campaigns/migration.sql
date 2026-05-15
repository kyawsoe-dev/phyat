-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "campaign_url" TEXT,
ADD COLUMN     "click_goal" INTEGER,
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "start_date" TIMESTAMP(3);
