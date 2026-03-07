import { StockStatus } from "@/generated/prisma";

export type StockVariantItem = {
  id: string;
  variant: string | null;
  minStock: number;
  maxStock: number;
  currentStock: number;
  status: StockStatus;
};

export type StockItem = {
  productId: string;
  productName: string;
  category: string;
  variants: StockVariantItem[];
  minStock: number;
  maxStock: number;
  currentStock: number;
  status: StockStatus;
};
