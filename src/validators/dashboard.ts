import { z } from "zod";

export const listDashboardSummaryInputSchema = z.void();

export const dashboardStatsSchema = z.object({
  totalOrders: z.number().int().min(0),
  totalOrdersChangePct: z.number(),
  preOrders: z.number().int().min(0),
  preOrdersChangePct: z.number(),
  totalSales: z.number().min(0),
  totalSalesChangePct: z.number(),
  pendingPayments: z.number().int().min(0),
  pendingPaymentsChangePct: z.number(),
});

export const dashboardRecentOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  schedule: z.string(),
  items: z.number().int().min(0),
  amount: z.number().min(0),
  status: z.enum(["Pending", "To Pay", "Processing", "Ready", "Completed", "Cancelled"]),
});

export const listDashboardSummaryOutputSchema = z.object({
  stats: dashboardStatsSchema,
  recentOrders: z.array(dashboardRecentOrderSchema),
});
