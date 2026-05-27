/*
  Warnings:

  - You are about to drop the column `chronicIllCount` on the `households` table. All the data in the column will be lost.
  - You are about to drop the column `emk1Quantity` on the `households` table. All the data in the column will be lost.
  - You are about to drop the column `emk2Quantity` on the `households` table. All the data in the column will be lost.
  - You are about to drop the column `emk3Quantity` on the `households` table. All the data in the column will be lost.
  - You are about to drop the column `householdSize` on the `households` table. All the data in the column will be lost.
  - You are about to drop the column `totalEmkQuantity` on the `households` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `volunteers` table. All the data in the column will be lost.
  - You are about to drop the `central_stock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refresh_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "volunteers" DROP CONSTRAINT "volunteers_userId_fkey";

-- DropIndex
DROP INDEX "volunteers_userId_key";

-- AlterTable
ALTER TABLE "households" DROP COLUMN "chronicIllCount",
DROP COLUMN "emk1Quantity",
DROP COLUMN "emk2Quantity",
DROP COLUMN "emk3Quantity",
DROP COLUMN "householdSize",
DROP COLUMN "totalEmkQuantity";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "lastLoginAt";

-- AlterTable
ALTER TABLE "volunteers" DROP COLUMN "userId";

-- DropTable
DROP TABLE "central_stock";

-- DropTable
DROP TABLE "refresh_tokens";

-- CreateTable
CREATE TABLE "central_stock_movements" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "centralWarehouseId" TEXT NOT NULL,
    "emkType" "EmkType" NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "performedById" TEXT NOT NULL,

    CONSTRAINT "central_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "central_stock_movements_createdAt_idx" ON "central_stock_movements"("createdAt");

-- AddForeignKey
ALTER TABLE "central_stock_movements" ADD CONSTRAINT "central_stock_movements_centralWarehouseId_fkey" FOREIGN KEY ("centralWarehouseId") REFERENCES "central_warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "central_stock_movements" ADD CONSTRAINT "central_stock_movements_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
