import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import {
  listDashboardSummaryInputSchema,
  listDashboardSummaryOutputSchema,
} from "@/validators/dashboard";

const formatOrderDate = (date: Date | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const toPercentChange = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 100);
};

export const listDashboardSummary = base
  .route({
    method: "GET",
    path: "/dashboard/summary",
    summary: "get admin dashboard summary",
    tags: ["dashboard"],
  })
  .input(listDashboardSummaryInputSchema)
  .output(listDashboardSummaryOutputSchema)
  .handler(async () => {
    const now = new Date();
    const currentWindowStart = new Date(now);
    currentWindowStart.setDate(currentWindowStart.getDate() - 7);

    const previousWindowStart = new Date(currentWindowStart);
    previousWindowStart.setDate(previousWindowStart.getDate() - 7);

    const [
      totalOrders,
      preOrders,
      pendingPayments,
      verifiedPayments,
      recentOrdersRaw,
      currentOrders,
      previousOrders,
      currentPreOrders,
      previousPreOrders,
      currentPendingPayments,
      previousPendingPayments,
      currentVerifiedPayments,
      previousVerifiedPayments,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          stage: {
            in: ["TO_CONFIRM", "TO_PAY"],
          },
        },
      }),
      prisma.payment.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: "VERIFIED",
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
          payment: {
            select: {
              amount: true,
            },
          },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: currentWindowStart,
          },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: previousWindowStart,
            lt: currentWindowStart,
          },
        },
      }),
      prisma.order.count({
        where: {
          stage: {
            in: ["TO_CONFIRM", "TO_PAY"],
          },
          createdAt: {
            gte: currentWindowStart,
          },
        },
      }),
      prisma.order.count({
        where: {
          stage: {
            in: ["TO_CONFIRM", "TO_PAY"],
          },
          createdAt: {
            gte: previousWindowStart,
            lt: currentWindowStart,
          },
        },
      }),
      prisma.payment.count({
        where: {
          status: "PENDING",
          createdAt: {
            gte: currentWindowStart,
          },
        },
      }),
      prisma.payment.count({
        where: {
          status: "PENDING",
          createdAt: {
            gte: previousWindowStart,
            lt: currentWindowStart,
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: "VERIFIED",
          createdAt: {
            gte: currentWindowStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: "VERIFIED",
          createdAt: {
            gte: previousWindowStart,
            lt: currentWindowStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      stats: {
        totalOrders,
        totalOrdersChangePct: toPercentChange(currentOrders, previousOrders),
        preOrders,
        preOrdersChangePct: toPercentChange(currentPreOrders, previousPreOrders),
        totalSales: Number(verifiedPayments._sum.amount ?? 0),
        totalSalesChangePct: toPercentChange(
          Number(currentVerifiedPayments._sum.amount ?? 0),
          Number(previousVerifiedPayments._sum.amount ?? 0),
        ),
        pendingPayments,
        pendingPaymentsChangePct: toPercentChange(
          currentPendingPayments,
          previousPendingPayments,
        ),
      },
      recentOrders: recentOrdersRaw.map((order) => {
        const amount = Number(order.payment?.amount ?? 0);
        const status =
          order.stage === "COMPLETED" || order.releaseStatus === "RELEASED"
            ? ("Completed" as const)
            : order.stage === "PAID"
              ? ("Preparing" as const)
              : ("Pending" as const);

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user.fullName,
          schedule: formatOrderDate(order.pickupDate),
          items: order.totalQuantity,
          amount,
          status,
        };
      }),
    };
  });
