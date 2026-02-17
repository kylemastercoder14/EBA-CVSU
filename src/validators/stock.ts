import { StockStatus } from "@/generated/prisma";
import { z } from "zod";

export const listStocksInputSchema = z.void();

export const stockItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  category: z.string(),
  minStock: z.number(),
  maxStock: z.number(),
  currentStock: z.number(),
  status: z.enum(StockStatus),
});

export const listStocksOutputSchema = z.object({
  stocks: z.array(stockItemSchema),
});

export const updateStockSchema = z.object({
  id: z.string().min(1, "Stock item ID is required"),
  minStock: z.number().int().min(0, "Minimum stock must be 0 or greater"),
  maxStock: z.number().int().min(0, "Maximum stock must be 0 or greater"),
  currentStock: z.number().int().min(0, "Current stock must be 0 or greater"),
});

export const updateStockOutputSchema = stockItemSchema;
