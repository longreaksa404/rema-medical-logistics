/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `volunteers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "volunteers" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_userId_key" ON "volunteers"("userId");

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
