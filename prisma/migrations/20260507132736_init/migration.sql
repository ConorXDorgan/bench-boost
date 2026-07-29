-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "eid" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "personnelNumber" TEXT,
    "managementLevel" TEXT,
    "jobFamily" TEXT,
    "jobFamilyGroup" TEXT,
    "orgUnitL4" TEXT,
    "location" TEXT,
    "country" TEXT,
    "metroCity" TEXT,
    "bucket" TEXT NOT NULL,
    "unknown" BOOLEAN NOT NULL DEFAULT false,
    "firstStaffableDate" TIMESTAMP(3),
    "weeksOut" INTEGER,
    "allocationPct" INTEGER,
    "staffableStatus" TEXT,
    "staffableDetailedStatus" TEXT,
    "firstStaffableCategory" TEXT,
    "availableTimeFlag" TEXT,
    "currentClient" TEXT,
    "currentProject" TEXT,
    "currentProjectStart" TIMESTAMP(3),
    "currentProjectEnd" TIMESTAMP(3),
    "rollOffConfirmed" TEXT,
    "currentComments" TEXT,
    "skills" TEXT,
    "specializationsEarned" TEXT,
    "specializationsBuilding" TEXT,
    "specializationsAspirational" TEXT,
    "languages" TEXT,
    "certifications" TEXT,
    "workdayUrl" TEXT,
    "cvUrl" TEXT,
    "rawJson" TEXT NOT NULL,
    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snapshot_snapshotDate_idx" ON "Snapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "Resource_snapshotId_bucket_idx" ON "Resource"("snapshotId", "bucket");

-- CreateIndex
CREATE INDEX "Resource_eid_idx" ON "Resource"("eid");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
