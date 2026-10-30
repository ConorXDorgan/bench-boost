-- CreateTable
CREATE TABLE "ResourceNote" (
    "id" TEXT NOT NULL,
    "eid" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ResourceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceNote_eid_createdAt_idx" ON "ResourceNote"("eid", "createdAt");
