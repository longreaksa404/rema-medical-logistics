-- CreateTable
CREATE TABLE "flood_alerts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "warningLevelTwo" BOOLEAN NOT NULL DEFAULT false,
    "rainfallExceeds100mm" BOOLEAN NOT NULL DEFAULT false,
    "streetFloodingReport" BOOLEAN NOT NULL DEFAULT false,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "phase" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "flood_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "districtId" TEXT NOT NULL,
    "emk1Total" INTEGER NOT NULL DEFAULT 0,
    "emk1Remaining" INTEGER NOT NULL DEFAULT 0,
    "emk2Total" INTEGER NOT NULL DEFAULT 0,
    "emk2Remaining" INTEGER NOT NULL DEFAULT 0,
    "emk3Total" INTEGER NOT NULL DEFAULT 0,
    "emk3Remaining" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "medicalUrgencyScore" INTEGER NOT NULL DEFAULT 0,
    "vulnerabilityScore" INTEGER NOT NULL DEFAULT 0,
    "floodExposureScore" INTEGER NOT NULL DEFAULT 0,
    "selfSufficiencyScore" INTEGER NOT NULL DEFAULT 0,
    "isolationScore" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "priorityBand" TEXT NOT NULL DEFAULT 'STANDARD',
    "recommendedEmk" TEXT NOT NULL DEFAULT 'EMK1',
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "districtId" TEXT NOT NULL,
    "waterDepthCm" INTEGER NOT NULL,
    "deliveryMode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_key" ON "districts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stock_districtId_key" ON "stock"("districtId");

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "households" ADD CONSTRAINT "households_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
