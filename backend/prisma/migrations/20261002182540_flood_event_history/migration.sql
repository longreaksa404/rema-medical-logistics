-- AlterTable
ALTER TABLE "flood_alerts" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "phase2At" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "flood_alerts_closedAt_createdAt_idx" ON "flood_alerts"("closedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "flood_alerts" ADD CONSTRAINT "flood_alerts_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
