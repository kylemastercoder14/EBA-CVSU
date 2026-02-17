import { StockStatus } from "@/generated/prisma";

export type StockItem = {
  id: string;
  productId: string;
  productName: string;
  category: string;
  minStock: number;
  maxStock: number;
  currentStock: number;
  status: StockStatus;
};
