-- CreateEnum
CREATE TYPE "ReplaceReason" AS ENUM ('WRONG_ITEM', 'DEFECTIVE_ITEM', 'WRONG_SIZE', 'CHANGE_OF_MIND');

-- CreateEnum
CREATE TYPE "ReplaceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "replace_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" "ReplaceReason" NOT NULL,
    "status" "ReplaceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replace_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "replace_requests_orderId_idx" ON "replace_requests"("orderId");

-- CreateIndex
CREATE INDEX "replace_requests_status_idx" ON "replace_requests"("status");

-- AddForeignKey
ALTER TABLE "replace_requests" ADD CONSTRAINT "replace_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
