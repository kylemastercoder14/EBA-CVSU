/* eslint-disable no-console */
require("dotenv/config");
const fs = require("fs");
const path = require("path");
const { PrismaPg } = require("@prisma/adapter-pg");
const {
  PrismaClient,
  Prisma,
} = require(path.join(process.cwd(), "src", "generated", "prisma"));

const DATA_DIR = path.join(process.cwd(), "data");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const readJson = (filename) => {
  const fullPath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(fullPath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
};

const toDate = (value) => {
  if (!value) return undefined;
  const normalized = String(value).replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const run = async () => {
  const staffRows = readJson("staff.json");
  const productRows = readJson("products.json");
  const variantRows = readJson("product_variants.json");
  const stockRows = readJson("stock_items.json");
  const logRows = readJson("system_logs.json");

  const result = {
    staff: 0,
    products: 0,
    variants: 0,
    stockItems: 0,
    systemLogs: 0,
  };

  for (const row of staffRows) {
    await prisma.staff.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            fullName: row.fullName,
            accessKey: row.accessKey,
            mobileNumber: row.mobileNumber,
            role: row.role ?? "STAFF",
            isActive: Boolean(row.isActive),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          },
          update: {
            fullName: row.fullName,
            accessKey: row.accessKey,
            mobileNumber: row.mobileNumber,
            role: row.role ?? "STAFF",
            isActive: Boolean(row.isActive),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          },
        });
    result.staff += 1;
  }

  for (const row of productRows) {
    await prisma.product.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            name: row.name,
            category: row.category,
            imageUrl: row.imageUrl ?? null,
            isActive: Boolean(row.isActive),
            isVisitorOrderable: Boolean(row.isVisitorOrderable),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          },
          update: {
            name: row.name,
            category: row.category,
            imageUrl: row.imageUrl ?? null,
            isActive: Boolean(row.isActive),
            isVisitorOrderable: Boolean(row.isVisitorOrderable),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          },
        });
    result.products += 1;
  }

  for (const row of variantRows) {
    await prisma.productVariant.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            productId: row.productId,
            size: row.size,
            price: new Prisma.Decimal(row.price),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          },
          update: {
            productId: row.productId,
            size: row.size,
            price: new Prisma.Decimal(row.price),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          },
        });
    result.variants += 1;
  }

  for (const row of stockRows) {
    await prisma.stockItem.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            productId: row.productId,
            productVariantId: row.productVariantId ?? null,
            minStock: row.minStock,
            maxStock: row.maxStock,
            currentStock: row.currentStock,
            status: row.status,
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          },
          update: {
            productId: row.productId,
            productVariantId: row.productVariantId ?? null,
            minStock: row.minStock,
            maxStock: row.maxStock,
            currentStock: row.currentStock,
            status: row.status,
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          },
        });
    result.stockItems += 1;
  }

  for (const row of logRows) {
    await prisma.systemLog.upsert({
          where: { id: row.id },
          create: {
            id: row.id,
            logCode: row.logCode,
            type: row.type,
            category: row.category,
            description: row.description,
            status: row.status,
            actorName: row.actorName ?? "System",
            actorUserId: row.actorUserId ?? null,
            orderId: row.orderId ?? null,
            paymentId: row.paymentId ?? null,
            productId: row.productId ?? null,
            stockItemId: row.stockItemId ?? null,
            createdAt: toDate(row.createdAt),
          },
          update: {
            logCode: row.logCode,
            type: row.type,
            category: row.category,
            description: row.description,
            status: row.status,
            actorName: row.actorName ?? "System",
            actorUserId: row.actorUserId ?? null,
            orderId: row.orderId ?? null,
            paymentId: row.paymentId ?? null,
            productId: row.productId ?? null,
            stockItemId: row.stockItemId ?? null,
            createdAt: toDate(row.createdAt),
          },
        });
    result.systemLogs += 1;
  }

  console.log("JSON seed complete.");
  console.log(`Staff: ${result.staff}`);
  console.log(`Products: ${result.products}`);
  console.log(`Product Variants: ${result.variants}`);
  console.log(`Stock Items: ${result.stockItems}`);
  console.log(`System Logs: ${result.systemLogs}`);
};

run()
  .catch((error) => {
    console.error("JSON seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
