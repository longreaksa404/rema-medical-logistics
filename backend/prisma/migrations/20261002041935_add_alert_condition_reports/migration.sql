-- CreateTable
CREATE TABLE "alert_condition_reports" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,

    CONSTRAINT "alert_condition_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_condition_reports_alertId_createdAt_idx" ON "alert_condition_reports"("alertId", "createdAt");

-- AddForeignKey
ALTER TABLE "alert_condition_reports" ADD CONSTRAINT "alert_condition_reports_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "flood_alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_condition_reports" ADD CONSTRAINT "alert_condition_reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
