-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "accessKey" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_accessKey_key" ON "staff"("accessKey");

-- CreateIndex
CREATE INDEX "staff_fullName_idx" ON "staff"("fullName");

-- CreateIndex
CREATE INDEX "staff_accessKey_idx" ON "staff"("accessKey");
