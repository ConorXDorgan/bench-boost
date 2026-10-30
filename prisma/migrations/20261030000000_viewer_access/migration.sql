-- CreateTable
CREATE TABLE "ViewerAccess" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "passwordHash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "ViewerAccess_pkey" PRIMARY KEY ("id")
);
