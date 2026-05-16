-- CreateTable
CREATE TABLE "central_warehouse" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emk1Total" INTEGER NOT NULL DEFAULT 0,
    "emk1Remaining" INTEGER NOT NULL DEFAULT 0,
    "emk2Total" INTEGER NOT NULL DEFAULT 0,
    "emk2Remaining" INTEGER NOT NULL DEFAULT 0,
    "emk3Total" INTEGER NOT NULL DEFAULT 0,
    "emk3Remaining" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "central_warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "central_stock" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emk1Total" INTEGER NOT NULL DEFAULT 0,
    "emk1Remaining" INTEGER NOT NULL DEFAULT 0,
    "emk2Total" INTEGER NOT NULL DEFAULT 0,
    "emk2Remaining" INTEGER NOT NULL DEFAULT 0,
    "emk3Total" INTEGER NOT NULL DEFAULT 0,
    "emk3Remaining" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "central_stock_pkey" PRIMARY KEY ("id")
);
