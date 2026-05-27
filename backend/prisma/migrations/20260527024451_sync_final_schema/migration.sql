-- AlterTable
ALTER TABLE "households" ADD COLUMN     "chronicIllCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emk1Quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "emk2Quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emk3Quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "householdSize" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "totalEmkQuantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
