/*
  Warnings:

  - The `priorityBand` column on the `households` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `recommendedEmk` column on the `households` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `districtId` on the `stock` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[subWarehouseId]` on the table `stock` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `zone` to the `routes` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `deliveryMode` on the `routes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `subWarehouseId` to the `stock` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'EMERGENCY_COORDINATOR', 'HUB_MANAGER', 'VOLUNTEER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SubWarehouseStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'BACKUP_ACTIVATED');

-- CreateEnum
CREATE TYPE "EmkType" AS ENUM ('EMK1', 'EMK2', 'EMK3');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('DISPATCH', 'DELIVERY', 'REALLOCATION', 'ADJUSTMENT', 'MOH_TRANSFER');

-- CreateEnum
CREATE TYPE "PriorityBand" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'STANDARD');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('MOTORBIKE', 'BICYCLE_OR_FOOT', 'BOAT', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DeliveryRunStatus" AS ENUM ('IN_PROGRESS', 'COMPLETE', 'ABORTED');

-- CreateEnum
CREATE TYPE "VolunteerRole" AS ENUM ('TEAM_LEADER', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('AVAILABLE', 'DEPLOYED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('ROUTE_BLOCKED', 'VOLUNTEER_SAFETY', 'STOCK_SCARCITY', 'BUILDING_FLOODED', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RadioCheckTime" AS ENUM ('T0800', 'T1200', 'T1600', 'T2000');

-- CreateEnum
CREATE TYPE "RadioStatus" AS ENUM ('OK', 'ISSUE_REPORTED');

-- DropForeignKey
ALTER TABLE "stock" DROP CONSTRAINT "stock_districtId_fkey";

-- DropIndex
DROP INDEX "stock_districtId_key";

-- AlterTable
ALTER TABLE "districts" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "households" ADD COLUMN     "assessedById" TEXT,
DROP COLUMN "priorityBand",
ADD COLUMN     "priorityBand" "PriorityBand" NOT NULL DEFAULT 'STANDARD',
DROP COLUMN "recommendedEmk",
ADD COLUMN     "recommendedEmk" "EmkType" NOT NULL DEFAULT 'EMK1';

-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "zone" TEXT NOT NULL,
DROP COLUMN "deliveryMode",
ADD COLUMN     "deliveryMode" "DeliveryMode" NOT NULL;

-- AlterTable
ALTER TABLE "stock" DROP COLUMN "districtId",
ADD COLUMN     "subWarehouseId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "districtId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_warehouses" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "SubWarehouseStatus" NOT NULL DEFAULT 'INACTIVE',
    "capacitySqm" INTEGER NOT NULL,
    "isBackup" BOOLEAN NOT NULL DEFAULT false,
    "backupForId" TEXT,

    CONSTRAINT "sub_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subWarehouseId" TEXT NOT NULL,
    "emkType" "EmkType" NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "performedById" TEXT NOT NULL,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_assessments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "cat1Score" INTEGER NOT NULL,
    "cat2Score" INTEGER NOT NULL,
    "cat3Score" INTEGER NOT NULL,
    "cat4Score" INTEGER NOT NULL,
    "cat5Score" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "household_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "VolunteerRole" NOT NULL DEFAULT 'VOLUNTEER',
    "status" "VolunteerStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_assignments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "volunteerId" TEXT NOT NULL,
    "subWarehouseId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "teamNumber" INTEGER NOT NULL,

    CONSTRAINT "volunteer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_runs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subWarehouseId" TEXT NOT NULL,
    "teamNumber" INTEGER NOT NULL,
    "zone" TEXT NOT NULL,
    "departedAt" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "DeliveryRunStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "leadVolunteerId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,

    CONSTRAINT "delivery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_receipts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryRunId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "emkType" "EmkType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "deliveredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "delivery_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "routeId" TEXT NOT NULL,
    "previousDepth" INTEGER NOT NULL,
    "newDepth" INTEGER NOT NULL,
    "previousMode" "DeliveryMode" NOT NULL,
    "newMode" "DeliveryMode" NOT NULL,
    "reportedById" TEXT NOT NULL,

    CONSTRAINT "route_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "districtId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "reportedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radio_checkins" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "districtId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "scheduledTime" "RadioCheckTime" NOT NULL,
    "status" "RadioStatus" NOT NULL DEFAULT 'OK',
    "notes" TEXT,

    CONSTRAINT "radio_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sub_warehouses_districtId_key" ON "sub_warehouses"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_subWarehouseId_key" ON "stock"("subWarehouseId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_warehouses" ADD CONSTRAINT "sub_warehouses_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_subWarehouseId_fkey" FOREIGN KEY ("subWarehouseId") REFERENCES "sub_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_subWarehouseId_fkey" FOREIGN KEY ("subWarehouseId") REFERENCES "sub_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_assessments" ADD CONSTRAINT "household_assessments_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_assessments" ADD CONSTRAINT "household_assessments_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "volunteers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_subWarehouseId_fkey" FOREIGN KEY ("subWarehouseId") REFERENCES "sub_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_assignments" ADD CONSTRAINT "volunteer_assignments_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "flood_alerts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_subWarehouseId_fkey" FOREIGN KEY ("subWarehouseId") REFERENCES "sub_warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_leadVolunteerId_fkey" FOREIGN KEY ("leadVolunteerId") REFERENCES "volunteers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_runs" ADD CONSTRAINT "delivery_runs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_receipts" ADD CONSTRAINT "delivery_receipts_deliveryRunId_fkey" FOREIGN KEY ("deliveryRunId") REFERENCES "delivery_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_receipts" ADD CONSTRAINT "delivery_receipts_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_logs" ADD CONSTRAINT "route_logs_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_logs" ADD CONSTRAINT "route_logs_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radio_checkins" ADD CONSTRAINT "radio_checkins_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radio_checkins" ADD CONSTRAINT "radio_checkins_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
