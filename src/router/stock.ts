import { StockStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import {
  listStocksInputSchema,
  listStocksOutputSchema,
  updateStocksByProductOutputSchema,
  updateStocksByProductSchema,
  updateStockOutputSchema,
  updateStockSchema,
} from "@/validators/stock";

const getStockStatus = (minStock: number, currentStock: number): StockStatus => {
  if (currentStock <= minStock * 0.5) {
    return "CRITICAL";
  }
  if (currentStock <= minStock) {
    return "LOW";
  }
  return "NORMAL";
};

export const listStocks = base
  .route({
    method: "GET",
    path: "/stocks",
    summary: "list all stocks",
    tags: ["stocks"],
  })
  .input(listStocksInputSchema)
  .output(listStocksOutputSchema)
  .handler(async () => {
    const stockItems = await prisma.stockItem.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        productVariant: {
          select: {
            size: true,
          },
        },
      },
    });

    return {
      stocks: stockItems.map((stock) => ({
        id: stock.id,
        productId: stock.productId,
        productName: stock.product.name,
        variant: stock.productVariant?.size ?? null,
        category: stock.product.category,
        minStock: stock.minStock,
        maxStock: stock.maxStock,
        currentStock: stock.currentStock,
        status: stock.status,
      })),
    };
  });

export const updateStock = base
  .route({
    method: "PUT",
    path: "/stocks/{id}",
    summary: "update a stock item",
    tags: ["stocks"],
  })
  .input(updateStockSchema)
  .output(updateStockOutputSchema)
  .handler(async ({ input, errors }) => {
    if (input.maxStock < input.minStock) {
      throw errors.BAD_REQUEST();
    }

    const existingStock = await prisma.stockItem.findUnique({
      where: { id: input.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        productVariant: {
          select: {
            size: true,
          },
        },
      },
    });

    if (!existingStock) {
      throw errors.NOT_FOUND();
    }

    const status = getStockStatus(input.minStock, input.currentStock);

    const lastLog = await prisma.systemLog.findFirst({
      where: {
        id: {
          startsWith: "LOG",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextLogNumber = 1;
    if (lastLog) {
      const currentNumber = parseInt(lastLog.id.replace("LOG", ""));
      nextLogNumber = currentNumber + 1;
    }
    const logId = `LOG${nextLogNumber.toString().padStart(3, "0")}`;

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const logCode = `${logId}-${timestamp}`;

    const updatedStock = await prisma.$transaction(async (tx) => {
      const stock = await tx.stockItem.update({
        where: { id: input.id },
        data: {
          minStock: input.minStock,
          maxStock: input.maxStock,
          currentStock: input.currentStock,
          status,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          productVariant: {
            select: {
              size: true,
            },
          },
        },
      });

      await tx.systemLog.create({
        data: {
          id: logId,
          logCode,
          type: "SYSTEM",
          category: "STOCK_UPDATED",
          description: `Stock updated for "${stock.product.name}"${stock.productVariant?.size ? ` (${stock.productVariant.size})` : ""} (current: ${stock.currentStock}, min: ${stock.minStock}, max: ${stock.maxStock}, status: ${stock.status}).`,
          status: "SUCCESS",
          actorName: "System",
          productId: stock.productId,
          stockItemId: stock.id,
        },
      });

      return stock;
    });

    return {
      id: updatedStock.id,
      productId: updatedStock.productId,
      productName: updatedStock.product.name,
      variant: updatedStock.productVariant?.size ?? null,
      category: updatedStock.product.category,
      minStock: updatedStock.minStock,
      maxStock: updatedStock.maxStock,
      currentStock: updatedStock.currentStock,
      status: updatedStock.status,
    };
  });

export const updateStocksByProduct = base
  .route({
    method: "PUT",
    path: "/stocks/product/{productId}",
    summary: "update all stock rows for a product",
    tags: ["stocks"],
  })
  .input(updateStocksByProductSchema)
  .output(updateStocksByProductOutputSchema)
  .handler(async ({ input, errors }) => {
    for (const item of input.items) {
      if (item.maxStock < item.minStock) {
        throw errors.BAD_REQUEST();
      }
    }

    const existingRows = await prisma.stockItem.findMany({
      where: { productId: input.productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        productVariant: {
          select: {
            size: true,
          },
        },
      },
    });

    if (existingRows.length === 0) {
      throw errors.NOT_FOUND();
    }

    const existingById = new Map(existingRows.map((row) => [row.id, row]));
    if (!input.items.every((item) => existingById.has(item.id))) {
      throw errors.BAD_REQUEST();
    }

    const lastLog = await prisma.systemLog.findFirst({
      where: {
        id: {
          startsWith: "LOG",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextLogNumber = 1;
    if (lastLog) {
      const currentNumber = parseInt(lastLog.id.replace("LOG", ""));
      nextLogNumber = currentNumber + 1;
    }

    const updatedStocks = await prisma.$transaction(async (tx) => {
      const rows = [] as Array<{
        id: string;
        productId: string;
        productName: string;
        variant: string | null;
        category: string;
        minStock: number;
        maxStock: number;
        currentStock: number;
        status: StockStatus;
      }>;

      for (const item of input.items) {
        const status = getStockStatus(item.minStock, item.currentStock);
        const updated = await tx.stockItem.update({
          where: { id: item.id },
          data: {
            minStock: item.minStock,
            maxStock: item.maxStock,
            currentStock: item.currentStock,
            status,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
            productVariant: {
              select: {
                size: true,
              },
            },
          },
        });

        const logId = `LOG${nextLogNumber.toString().padStart(3, "0")}`;
        nextLogNumber += 1;
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:T]/g, "")
          .slice(0, 14);
        const logCode = `${logId}-${timestamp}`;

        await tx.systemLog.create({
          data: {
            id: logId,
            logCode,
            type: "SYSTEM",
            category: "STOCK_UPDATED",
            description: `Stock updated for "${updated.product.name}"${updated.productVariant?.size ? ` (${updated.productVariant.size})` : ""} (current: ${updated.currentStock}, min: ${updated.minStock}, max: ${updated.maxStock}, status: ${updated.status}).`,
            status: "SUCCESS",
            actorName: "System",
            productId: updated.productId,
            stockItemId: updated.id,
          },
        });

        rows.push({
          id: updated.id,
          productId: updated.productId,
          productName: updated.product.name,
          variant: updated.productVariant?.size ?? null,
          category: updated.product.category,
          minStock: updated.minStock,
          maxStock: updated.maxStock,
          currentStock: updated.currentStock,
          status: updated.status,
        });
      }

      return rows;
    });

    return {
      productId: input.productId,
      updatedCount: updatedStocks.length,
      stocks: updatedStocks,
    };
  });
