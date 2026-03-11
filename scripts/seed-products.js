/* eslint-disable no-console */
require("dotenv/config");
const fs = require("fs");
const path = require("path");
const { PrismaPg } = require("@prisma/adapter-pg");
const {
  PrismaClient,
  Prisma,
} = require(path.join(process.cwd(), "src", "generated", "prisma"));

const NO_VARIANT_SIZE = "No Size";

const productsToSeed = [
  {
    name: "College Polo",
    category: "Uniforms",
    isVisitorOrderable: false,
    imageUrl: "/uploads/products/product-1771408674860-471250734.png",
    variants: [
      { size: "Small", price: 305 },
      { size: "Medium", price: 305 },
      { size: "Large", price: 305 },
      { size: "X-Large", price: 325 },
      { size: "2X-Large", price: 340 },
      { size: "3X-Large", price: 360 },
    ],
  },
  {
    name: "College Blouse",
    category: "Uniforms",
    isVisitorOrderable: false,
    imageUrl: "/uploads/products/product-1771408777664-113030732.png",
    variants: [
      { size: "Small", price: 290 },
      { size: "Medium", price: 290 },
      { size: "Large", price: 290 },
      { size: "X-Large", price: 305 },
      { size: "2X-Large", price: 310 },
      { size: "3X-Large", price: 315 },
    ],
  },
  {
    name: "College Green Slacks",
    category: "Uniforms",
    isVisitorOrderable: false,
    imageUrl: "/uploads/products/product-1771557295959-71986119.png",
    variants: [
      { size: "Extra Small", price: 320 },
      { size: "Small", price: 340 },
      { size: "Medium", price: 360 },
      { size: "Large", price: 375 },
      { size: "X-Large", price: 400 },
      { size: "2X-Large", price: 415 },
      { size: "3X-Large", price: 435 },
    ],
  },
  {
    name: "PE T-Shirt",
    category: "Uniforms",
    isVisitorOrderable: false,
    imageUrl: "/uploads/products/product-1771557406010-738866145.png",
    variants: [
      { size: "Small", price: 270 },
      { size: "Medium", price: 270 },
      { size: "Large", price: 270 },
      { size: "X-Large", price: 270 },
      { size: "2X-Large", price: 290 },
      { size: "3X-Large", price: 310 },
    ],
  },
  {
    name: "PE Short",
    category: "Uniforms",
    isVisitorOrderable: false,
    imageUrl: "/uploads/products/product-1771557494173-425267547.png",
    variants: [
      { size: "Small", price: 270 },
      { size: "Medium", price: 270 },
      { size: "Large", price: 270 },
      { size: "X-Large", price: 275 },
      { size: "2X-Large", price: 290 },
    ],
  },
  {
    name: "Test Booklet",
    category: "Booklet",
    isVisitorOrderable: true,
    imageUrl: "/uploads/products/product-1771557619988-433801263.png",
    variants: [{ size: NO_VARIANT_SIZE, price: 4 }],
  },
  {
    name: "ID Lace",
    category: "ID Lace",
    isVisitorOrderable: true,
    imageUrl: "/uploads/products/product-1771254955142-904520470.png",
    variants: [{ size: NO_VARIANT_SIZE, price: 80 }],
  },
];

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const parseLastNumericId = async (tx, model, prefix) => {
  const last = await tx[model].findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  if (!last) return 0;
  const value = Number.parseInt(last.id.replace(prefix, ""), 10);
  return Number.isNaN(value) ? 0 : value;
};

const resolveImageUrl = (url) => {
  if (!url) return null;
  const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  return fs.existsSync(filePath) ? url : null;
};

const run = async () => {
  const seeded = await prisma.$transaction(async (tx) => {
    let nextProductNumber = (await parseLastNumericId(tx, "product", "P")) + 1;
    let nextVariantNumber =
      (await parseLastNumericId(tx, "productVariant", "PV")) + 1;
    let nextStockNumber = (await parseLastNumericId(tx, "stockItem", "SI")) + 1;

    let created = 0;
    let updated = 0;

    for (const productInput of productsToSeed) {
      const existing = await tx.product.findFirst({
        where: { name: productInput.name },
        select: { id: true },
      });

      const imageUrl = resolveImageUrl(productInput.imageUrl);

      if (!existing) {
        const productId = `P${String(nextProductNumber).padStart(3, "0")}`;
        nextProductNumber += 1;

        const variants = productInput.variants.map((variant) => {
          const id = `PV${String(nextVariantNumber).padStart(3, "0")}`;
          nextVariantNumber += 1;
          return {
            id,
            size: variant.size,
            price: new Prisma.Decimal(variant.price),
          };
        });

        await tx.product.create({
          data: {
            id: productId,
            name: productInput.name,
            category: productInput.category,
            imageUrl,
            isActive: true,
            isVisitorOrderable: productInput.isVisitorOrderable,
            variants: { create: variants },
          },
        });

        for (const variant of variants) {
          const stockId = `SI${String(nextStockNumber).padStart(3, "0")}`;
          nextStockNumber += 1;
          await tx.stockItem.create({
            data: {
              id: stockId,
              productId,
              productVariantId: variant.size === NO_VARIANT_SIZE ? null : variant.id,
              minStock: 0,
              maxStock: 0,
              currentStock: 0,
              status: "CRITICAL",
            },
          });
        }

        created += 1;
        continue;
      }

      await tx.stockItem.deleteMany({ where: { productId: existing.id } });
      await tx.productVariant.deleteMany({ where: { productId: existing.id } });

      const variants = productInput.variants.map((variant) => {
        const id = `PV${String(nextVariantNumber).padStart(3, "0")}`;
        nextVariantNumber += 1;
        return {
          id,
          size: variant.size,
          price: new Prisma.Decimal(variant.price),
        };
      });

      await tx.product.update({
        where: { id: existing.id },
        data: {
          name: productInput.name,
          category: productInput.category,
          imageUrl,
          isActive: true,
          isVisitorOrderable: productInput.isVisitorOrderable,
          variants: { create: variants },
        },
      });

      for (const variant of variants) {
        const stockId = `SI${String(nextStockNumber).padStart(3, "0")}`;
        nextStockNumber += 1;
        await tx.stockItem.create({
          data: {
            id: stockId,
            productId: existing.id,
            productVariantId: variant.size === NO_VARIANT_SIZE ? null : variant.id,
            minStock: 0,
            maxStock: 0,
            currentStock: 0,
            status: "CRITICAL",
          },
        });
      }

      updated += 1;
    }

    return { created, updated };
  }, {
    timeout: 30000,
  });

  console.log("Product seed complete.");
  console.log(`Created: ${seeded.created}`);
  console.log(`Updated: ${seeded.updated}`);
  console.log("Excluded: NSTP Uniform (CWTS), NSTP Uniform (ROTC)");
};

run()
  .catch((error) => {
    console.error("Product seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
