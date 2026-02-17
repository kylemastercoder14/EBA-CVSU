import { prisma } from "@/lib/prisma";
import { createSystemLog } from "@/lib/system-log";
import { base } from "@/middlewares/base";
import { type StockStatus } from "@/generated/prisma";
import {
  createOrderInputSchema,
  createOrderOutputSchema,
  listOrdersMonitoringInputSchema,
  listOrdersMonitoringOutputSchema,
  listOrdersReleaseInputSchema,
  listOrdersReleaseOutputSchema,
  listOrdersByUserInputSchema,
  listOrdersByUserOutputSchema,
  updateOrderStatusInputSchema,
  updateOrderStatusOutputSchema,
} from "@/validators/order";

const getNextOrderNumber = async () => {
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: "ORD-",
      },
    },
    orderBy: {
      orderNumber: "desc",
    },
    select: {
      orderNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastOrder?.orderNumber) {
    const numericValue = Number.parseInt(lastOrder.orderNumber.replace("ORD-", ""), 10);
    if (!Number.isNaN(numericValue)) {
      nextNumber = numericValue + 1;
    }
  }

  return `ORD-${nextNumber.toString().padStart(4, "0")}`;
};

const getNextId = async (prefix: string, model: "order" | "payment" | "orderItem") => {
  if (model === "order") {
    const last = await prisma.order.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const numericValue = last ? Number.parseInt(last.id.replace(prefix, ""), 10) : 0;
    return `${prefix}${(Number.isNaN(numericValue) ? 1 : numericValue + 1).toString().padStart(4, "0")}`;
  }

  if (model === "payment") {
    const last = await prisma.payment.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const numericValue = last ? Number.parseInt(last.id.replace(prefix, ""), 10) : 0;
    return `${prefix}${(Number.isNaN(numericValue) ? 1 : numericValue + 1).toString().padStart(4, "0")}`;
  }

  const last = await prisma.orderItem.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const numericValue = last ? Number.parseInt(last.id.replace(prefix, ""), 10) : 0;
  return `${prefix}${(Number.isNaN(numericValue) ? 1 : numericValue + 1).toString().padStart(4, "0")}`;
};

type NotificationClient = {
  staff: {
    findMany: (args: {
      where: { isActive: boolean };
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
  };
  notification: {
    findFirst: (args: {
      where: { id: { startsWith: string } };
      orderBy: { id: "desc" };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
    createMany: (args: {
      data: Array<{
        id: string;
        staffId: string;
        title: string;
        message: string;
        type: "INFO" | "SUCCESS" | "WARNING";
      }>;
    }) => Promise<unknown>;
  };
};

const createStaffNotifications = async (
  client: NotificationClient,
  input: {
    title: string;
    message: string;
    type?: "INFO" | "SUCCESS" | "WARNING";
  },
) => {
  const activeStaff = await client.staff.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (activeStaff.length === 0) return;

  const lastNotification = await client.notification.findFirst({
    where: {
      id: {
        startsWith: "NOTIF",
      },
    },
    orderBy: {
      id: "desc",
    },
    select: { id: true },
  });

  let nextNumber = 1;
  if (lastNotification?.id) {
    const parsed = Number.parseInt(lastNotification.id.replace("NOTIF", ""), 10);
    if (!Number.isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  await client.notification.createMany({
    data: activeStaff.map((staff, index) => ({
      id: `NOTIF${(nextNumber + index).toString().padStart(3, "0")}`,
      staffId: staff.id,
      title: input.title,
      message: input.message,
      type: input.type ?? "INFO",
    })),
  });
};

const mapOrderStageToTrackStage = (stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED", releaseStatus: "READY" | "RELEASED") => {
  if (stage === "COMPLETED" || releaseStatus === "RELEASED") return "completed" as const;
  if (stage === "PAID" && releaseStatus === "READY") return "ready" as const;
  if (stage === "TO_PAY") return "preparing" as const;
  return "to-pay" as const;
};

const mapOrderStageToMonitoringStage = (
  stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED",
) => {
  if (stage === "TO_PAY") return "To Pay" as const;
  if (stage === "PAID") return "Paid" as const;
  if (stage === "COMPLETED") return "Completed" as const;
  return "To Confirm" as const;
};

const formatOrderDate = (date: Date | null) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const mapOrderReleaseStatus = (
  stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED",
  releaseStatus: "READY" | "RELEASED",
) => {
  if (releaseStatus === "RELEASED" || stage === "COMPLETED") {
    return "Released" as const;
  }
  return "Ready" as const;
};

const getStockStatus = (minStock: number, currentStock: number): StockStatus => {
  if (currentStock <= minStock * 0.5) {
    return "CRITICAL";
  }
  if (currentStock <= minStock) {
    return "LOW";
  }
  return "NORMAL";
};

export const listOrdersMonitoring = base
  .route({
    method: "GET",
    path: "/orders/admin/monitoring",
    summary: "list orders for admin order monitoring page",
    tags: ["orders"],
  })
  .input(listOrdersMonitoringInputSchema)
  .output(listOrdersMonitoringOutputSchema)
  .handler(async () => {
    const orders = await prisma.order.findMany({
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        payment: {
          select: {
            method: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      orders: orders.map((order) => {
        const itemsSummary =
          order.itemsSummary?.trim() ||
          order.orderItems.map((item) => item.product.name).join(", ") ||
          "-";

        const paymentMethod = order.paymentMethod ?? order.payment?.method ?? "CASH";

        return {
          id: order.id,
          orderNum: order.orderNumber,
          name: order.user.fullName,
          items: itemsSummary,
          quantity: order.totalQuantity,
          paymentMethod: paymentMethod === "GCASH" ? ("GCash" as const) : ("Cash" as const),
          paymentStatus:
            order.paymentStatus === "VERIFIED" ? ("Verified" as const) : ("Pending" as const),
          pickupDate: formatOrderDate(order.pickupDate),
          stage: mapOrderStageToMonitoringStage(order.stage),
        };
      }),
    };
  });

export const listOrdersRelease = base
  .route({
    method: "GET",
    path: "/orders/admin/release",
    summary: "list orders for admin order release page",
    tags: ["orders"],
  })
  .input(listOrdersReleaseInputSchema)
  .output(listOrdersReleaseOutputSchema)
  .handler(async () => {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          {
            stage: "PAID",
            releaseStatus: "READY",
          },
          {
            releaseStatus: "RELEASED",
          },
          {
            stage: "COMPLETED",
          },
        ],
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      orders: orders.map((order) => {
        const itemsSummary =
          order.itemsSummary?.trim() ||
          order.orderItems.map((item) => item.product.name).join(", ") ||
          "-";

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          name: order.user.fullName,
          items: itemsSummary,
          quantity: order.totalQuantity,
          pickupDate: formatOrderDate(order.pickupDate),
          status: mapOrderReleaseStatus(order.stage, order.releaseStatus),
        };
      }),
    };
  });

export const listOrdersByUser = base
  .route({
    method: "GET",
    path: "/orders/user/{userId}",
    summary: "list orders by user for track orders page",
    tags: ["orders"],
  })
  .input(listOrdersByUserInputSchema)
  .output(listOrdersByUserOutputSchema)
  .handler(async ({ input, errors }) => {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    if (!user) {
      throw errors.NOT_FOUND();
    }

    const orders = await prisma.order.findMany({
      where: { userId: input.userId },
      include: {
        orderItems: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderedAt: order.createdAt.toISOString().slice(0, 10),
        paymentMethod: order.paymentMethod === "CASH" ? "Cash" : "GCash",
        paymentStatus: order.paymentStatus,
        stage: mapOrderStageToTrackStage(order.stage, order.releaseStatus),
        items: order.orderItems.map((item) => ({
          id: item.id,
          name: item.product.name,
          quantity: item.quantity,
          size: item.productVariant?.size ?? "-",
          pickupDate: order.pickupDate ? order.pickupDate.toISOString().slice(0, 10) : "-",
          total: Number(item.unitPrice) * item.quantity,
          image: item.product.imageUrl ?? "",
        })),
      })),
    };
  });

export const createOrder = base
  .route({
    method: "POST",
    path: "/orders",
    summary: "create order from cart items",
    tags: ["orders"],
  })
  .input(createOrderInputSchema)
  .output(createOrderOutputSchema)
  .handler(async ({ input, errors }) => {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    if (!user) {
      throw errors.NOT_FOUND();
    }

    const itemsWithPricing = await Promise.all(
      input.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            variants: true,
          },
        });

        if (!product) {
          throw errors.NOT_FOUND();
        }

        const selectedVariant = product.variants.find((variant) => variant.size === item.variant);
        if (!selectedVariant) {
          throw errors.BAD_REQUEST();
        }

        return {
          ...item,
          productName: product.name,
          productVariantId: selectedVariant.id,
          unitPrice: Number(selectedVariant.price),
        };
      }),
    );

    const totalQuantity = itemsWithPricing.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = itemsWithPricing.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const pickupDateIso = input.items[0]?.pickupDate
      ? new Date(`${input.items[0].pickupDate}T00:00:00.000Z`).toISOString()
      : null;

    const itemsSummary = itemsWithPricing
      .map((item) => `${item.productName} (${item.variant}) x${item.quantity}`)
      .join(", ");

    const [orderId, paymentId, firstOrderItemId, orderNumber] = await Promise.all([
      getNextId("ORDR", "order"),
      getNextId("PAY", "payment"),
      getNextId("OI", "orderItem"),
      getNextOrderNumber(),
    ]);

    const paymentReference =
      input.paymentMethod === "GCASH"
        ? input.paymentReference?.trim() ?? ""
        : `CASH-${orderNumber}`;

    const created = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          orderNumber,
          userId: input.userId,
          itemsSummary,
          totalQuantity,
          pickupDate: pickupDateIso ? new Date(pickupDateIso) : null,
          stage: "TO_CONFIRM",
          paymentMethod: input.paymentMethod,
          paymentStatus: "PENDING",
        },
      });

      await tx.orderItem.createMany({
        data: itemsWithPricing.map((item, index) => ({
          id: `OI${(Number.parseInt(firstOrderItemId.replace("OI", ""), 10) + index)
            .toString()
            .padStart(4, "0")}`,
          orderId: createdOrder.id,
          productId: item.productId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      const createdPayment = await tx.payment.create({
        data: {
          id: paymentId,
          orderId: createdOrder.id,
          amount: totalAmount,
          reference: paymentReference,
          method: input.paymentMethod,
          status: "PENDING",
        },
      });

      await createSystemLog(tx, {
        type: "ORDER",
        category: "ORDER_CREATED",
        description: `Order "${createdOrder.orderNumber}" created with ${createdOrder.totalQuantity} item(s).`,
        status: "SUCCESS",
        actorName: "Student",
        actorUserId: input.userId,
        orderId: createdOrder.id,
      });

      await createSystemLog(tx, {
        type: "PAYMENT",
        category: "PAYMENT_PENDING",
        description: `Payment pending for order "${createdOrder.orderNumber}" via ${input.paymentMethod}.`,
        status: "INFO",
        actorName: "System",
        actorUserId: input.userId,
        orderId: createdOrder.id,
        paymentId: createdPayment.id,
      });

      await createStaffNotifications(tx, {
        title: "New Order Created",
        message: `Order ${createdOrder.orderNumber} is now waiting for confirmation.`,
        type: "INFO",
      });

      return createdOrder;
    });

    return {
      order: {
        id: created.id,
        orderNumber: created.orderNumber,
        paymentMethod: created.paymentMethod ?? input.paymentMethod,
        paymentStatus: created.paymentStatus,
        totalQuantity: created.totalQuantity,
        totalAmount,
        pickupDate: created.pickupDate ? created.pickupDate.toISOString() : null,
        createdAt: created.createdAt.toISOString(),
        paymentReference,
      },
    };
  });

export const updateOrderStatus = base
  .route({
    method: "PUT",
    path: "/orders/{orderId}/status",
    summary: "update order stage/release/payment status",
    tags: ["orders"],
  })
  .input(updateOrderStatusInputSchema)
  .output(updateOrderStatusOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingOrder = await prisma.order.findUnique({
      where: {
        id: input.orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        stage: true,
        releaseStatus: true,
        paymentStatus: true,
        userId: true,
      },
    });

    if (!existingOrder) {
      throw errors.NOT_FOUND();
    }

    const nextStage = input.stage ?? existingOrder.stage;
    const shouldDeductStock =
      existingOrder.stage !== "COMPLETED" && nextStage === "COMPLETED";

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (shouldDeductStock) {
        const orderItems = await tx.orderItem.findMany({
          where: { orderId: existingOrder.id },
          select: {
            productId: true,
            quantity: true,
          },
        });

        const quantityByProductId = new Map<string, number>();
        for (const item of orderItems) {
          quantityByProductId.set(
            item.productId,
            (quantityByProductId.get(item.productId) ?? 0) + item.quantity,
          );
        }

        const productIds = Array.from(quantityByProductId.keys());
        if (productIds.length > 0) {
          const stockItems = await tx.stockItem.findMany({
            where: {
              productId: { in: productIds },
            },
            include: {
              product: {
                select: {
                  name: true,
                },
              },
            },
          });

          if (stockItems.length !== productIds.length) {
            throw errors.BAD_REQUEST();
          }

          const stockByProductId = new Map(
            stockItems.map((stock) => [stock.productId, stock]),
          );

          for (const [productId, deductQuantity] of quantityByProductId.entries()) {
            const stock = stockByProductId.get(productId);
            if (!stock) {
              throw errors.BAD_REQUEST();
            }

            const nextStock = stock.currentStock - deductQuantity;
            if (nextStock < 0) {
              throw errors.BAD_REQUEST();
            }

            const nextStockStatus = getStockStatus(stock.minStock, nextStock);
            await tx.stockItem.update({
              where: { id: stock.id },
              data: {
                currentStock: nextStock,
                status: nextStockStatus,
              },
            });

            await createSystemLog(tx, {
              type: "SYSTEM",
              category: "STOCK_UPDATED",
              description: `Stock deducted by ${deductQuantity} for "${stock.product.name}" from order "${existingOrder.orderNumber}" (current: ${nextStock}).`,
              status: "SUCCESS",
              actorName: input.actorName ?? "System",
              actorUserId: existingOrder.userId,
              orderId: existingOrder.id,
              productId: stock.productId,
              stockItemId: stock.id,
            });
          }
        }
      }

      const order = await tx.order.update({
        where: { id: input.orderId },
        data: {
          ...(input.stage ? { stage: input.stage } : {}),
          ...(input.releaseStatus ? { releaseStatus: input.releaseStatus } : {}),
          ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
        },
      });

      const beforeText = `stage=${existingOrder.stage}, release=${existingOrder.releaseStatus}, payment=${existingOrder.paymentStatus}`;
      const afterText = `stage=${order.stage}, release=${order.releaseStatus}, payment=${order.paymentStatus}`;

      await createSystemLog(tx, {
        type: "ORDER",
        category: "ORDER_RELEASED",
        description: `Order "${order.orderNumber}" status updated (${beforeText} -> ${afterText}).`,
        status: "SUCCESS",
        actorName: input.actorName ?? "System",
        actorUserId: existingOrder.userId,
        orderId: order.id,
      });

      await createStaffNotifications(tx, {
        title: "Order Status Updated",
        message: `Order ${order.orderNumber} changed to ${order.stage}.`,
        type: "INFO",
      });

      return order;
    });

    return {
      success: true,
      message: "Order status updated successfully",
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        stage: updatedOrder.stage,
        releaseStatus: updatedOrder.releaseStatus,
        paymentStatus: updatedOrder.paymentStatus,
      },
    };
  });
