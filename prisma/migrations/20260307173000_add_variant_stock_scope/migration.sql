-- DropIndex
DROP INDEX "stock_items_productId_key";

-- AlterTable
ALTER TABLE "stock_items" ADD COLUMN     "productVariantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_productVariantId_key" ON "stock_items"("productVariantId");

-- CreateIndex
CREATE INDEX "stock_items_productId_idx" ON "stock_items"("productId");

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
