/* eslint-disable no-console */
require("dotenv/config");
const path = require("path");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require(path.join(process.cwd(), "src", "generated", "prisma"));

const NO_VARIANT_SIZE = "No Size";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const nextStockId = async (tx) => {
  const last = await tx.stockItem.findFirst({
    where: { id: { startsWith: "SI" } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const current = last ? Number.parseInt(last.id.replace("SI", ""), 10) : 0;
  const next = Number.isNaN(current) ? 1 : current + 1;
  return `SI${next.toString().padStart(3, "0")}`;
};

const run = async () => {
  const products = await prisma.product.findMany({
    include: {
      variants: true,
      stockItems: {
        include: {
          productVariant: {
            select: { id: true, size: true },
          },
        },
      },
    },
  });

  let convertedProducts = 0;
  let createdRows = 0;
  let deletedBaseRows = 0;
  let skippedProducts = 0;

  for (const product of products) {
    const realVariants = product.variants.filter(
      (variant) => variant.size !== NO_VARIANT_SIZE,
    );
    if (realVariants.length === 0) {
      skippedProducts += 1;
      continue;
    }

    const baseStockRow = product.stockItems.find(
      (row) => row.productVariantId === null,
    );
    if (!baseStockRow) {
      skippedProducts += 1;
      continue;
    }

    const existingVariantRows = new Map(
      product.stockItems
        .filter((row) => row.productVariantId)
        .map((row) => [row.productVariantId, row]),
    );
    const missingVariants = realVariants.filter(
      (variant) => !existingVariantRows.has(variant.id),
    );

    await prisma.$transaction(async (tx) => {
      if (missingVariants.length > 0) {
        const total = baseStockRow.currentStock;
        const each = Math.floor(total / missingVariants.length);
        let remainder = total % missingVariants.length;

        for (const variant of missingVariants) {
          const distribute = each + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder -= 1;

          await tx.stockItem.create({
            data: {
              id: await nextStockId(tx),
              productId: product.id,
              productVariantId: variant.id,
              minStock: baseStockRow.minStock,
              maxStock: baseStockRow.maxStock,
              currentStock: distribute,
              status: baseStockRow.status,
            },
          });
          createdRows += 1;
        }
      }

      await tx.stockItem.delete({
        where: { id: baseStockRow.id },
      });
      deletedBaseRows += 1;
      convertedProducts += 1;
    });
  }

  console.log("Variant stock backfill complete.");
  console.log(`Converted products: ${convertedProducts}`);
  console.log(`Created variant stock rows: ${createdRows}`);
  console.log(`Deleted base product stock rows: ${deletedBaseRows}`);
  console.log(`Skipped products: ${skippedProducts}`);
};

run()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
