-- CreateIndex
CREATE INDEX "delivery_runs_subWarehouseId_status_idx" ON "delivery_runs"("subWarehouseId", "status");

-- CreateIndex
CREATE INDEX "households_districtId_delivered_priorityBand_idx" ON "households"("districtId", "delivered", "priorityBand");

-- CreateIndex
CREATE INDEX "incidents_districtId_status_idx" ON "incidents"("districtId", "status");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "radio_checkins_districtId_createdAt_idx" ON "radio_checkins"("districtId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_subWarehouseId_createdAt_idx" ON "stock_movements"("subWarehouseId", "createdAt");
