-- AlterTable
ALTER TABLE "households" ADD COLUMN     "clientRef" TEXT;

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "clientRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "households_clientRef_key" ON "households"("clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_clientRef_key" ON "incidents"("clientRef");

