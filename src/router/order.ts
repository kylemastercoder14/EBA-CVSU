import { prisma } from "@/lib/prisma";
import { sendEbaSmsQueued, type EbaSmsSendResult } from "@/lib/eba-sms";
import { createSystemLog } from "@/lib/system-log";
import { base } from "@/middlewares/base";
import {
  type PaymentMethod,
  type StockStatus,
  type UserType,
} from "@/generated/prisma";
import {
  checkOrderNumberExistsInputSchema,
  checkOrderNumberExistsOutputSchema,
  createKioskOrderInputSchema,
  createKioskOrderOutputSchema,
  createOrderInputSchema,
  createOrderOutputSchema,
  listPreOrdersInputSchema,
  listPreOrdersOutputSchema,
  listOrdersMonitoringInputSchema,
  listOrdersMonitoringOutputSchema,
  listOrdersQueueInputSchema,
  listOrdersQueueOutputSchema,
  listOrdersReleaseInputSchema,
  listOrdersReleaseOutputSchema,
  listOrdersByUserInputSchema,
  listOrdersByUserOutputSchema,
  markPreOrderStockAvailableInputSchema,
  markPreOrderStockAvailableOutputSchema,
  updateOrderPickupDateInputSchema,
  updateOrderPickupDateOutputSchema,
  updateOrderStatusInputSchema,
  updateOrderStatusOutputSchema,
} from "@/validators/order";

type ReadySmsInput = {
  orderNumber: string;
  recipientNumber: string;
  customerName: string;
  pickupDate: Date | null;
  items: Array<{
    productName: string;
    quantity: number;
    size: string | null;
  }>;
};

type ReadySmsResult = EbaSmsSendResult;

const sendOrderReadySms = async (
  input: ReadySmsInput,
): Promise<ReadySmsResult> => {
  const message = `Hello ${input.customerName}, your order #${input.orderNumber} is now ready for pickup at the EBA Counter. Please bring your receipt for confirmation.`;

  return sendEbaSmsQueued({
    orderNumber: input.orderNumber,
    recipientNumber: input.recipientNumber,
    message,
  });
};

const sendPreOrderStockAvailableSms = async (input: {
  orderNumber: string;
  recipientNumber: string;
  customerName: string;
}): Promise<ReadySmsResult> => {
  const message = `Hello ${input.customerName}, your pre-order #${input.orderNumber} now has available stock. Please login and set your pickup date to continue.`;

  return sendEbaSmsQueued({
    orderNumber: input.orderNumber,
    recipientNumber: input.recipientNumber,
    message,
  });
};

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
    const numericValue = Number.parseInt(
      lastOrder.orderNumber.replace("ORD-", ""),
      10,
    );
    if (!Number.isNaN(numericValue)) {
      nextNumber = numericValue + 1;
    }
  }

  return `ORD-${nextNumber.toString().padStart(4, "0")}`;
};

const getNextId = async (
  prefix: string,
  model: "order" | "payment" | "orderItem",
) => {
  if (model === "order") {
    const last = await prisma.order.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const numericValue = last
      ? Number.parseInt(last.id.replace(prefix, ""), 10)
      : 0;
    return `${prefix}${(Number.isNaN(numericValue) ? 1 : numericValue + 1).toString().padStart(4, "0")}`;
  }

  if (model === "payment") {
    const last = await prisma.payment.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const numericValue = last
      ? Number.parseInt(last.id.replace(prefix, ""), 10)
      : 0;
    return `${prefix}${(Number.isNaN(numericValue) ? 1 : numericValue + 1).toString().padStart(4, "0")}`;
  }

  const last = await prisma.orderItem.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const numericValue = last
    ? Number.parseInt(last.id.replace(prefix, ""), 10)
    : 0;
  return `${prefix}${(Number.isNaN(numericValue) ? 1 : numericValue + 1).toString().padStart(4, "0")}`;
};

const getNextUserId = async (prefix: "KSTU" | "KVIS") => {
  const last = await prisma.user.findFirst({
    where: { id: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const numericValue = last
    ? Number.parseInt(last.id.replace(prefix, ""), 10)
    : 0;
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
    const parsed = Number.parseInt(
      lastNotification.id.replace("NOTIF", ""),
      10,
    );
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

const mapOrderStageToTrackStage = (
  stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED" | "CANCELLED",
  releaseStatus: "READY" | "RELEASED",
  paymentStatus: "PENDING" | "VERIFIED" | "DECLINED",
) => {
  if (stage === "CANCELLED" || paymentStatus === "DECLINED")
    return "cancelled" as const;
  if (
    stage === "COMPLETED" &&
    releaseStatus === "RELEASED" &&
    paymentStatus === "VERIFIED"
  )
    return "completed" as const;
  if (stage === "PAID" && releaseStatus === "READY") return "ready" as const;
  if (stage === "TO_PAY") return "preparing" as const;
  return "to-pay" as const;
};

const mapOrderStageToMonitoringStage = (
  stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED" | "CANCELLED",
  paymentStatus: "PENDING" | "VERIFIED" | "DECLINED",
  paymentMethod: PaymentMethod,
) => {
  if (stage === "CANCELLED" || paymentStatus === "DECLINED")
    return "Cancelled" as const;
  if (
    stage === "TO_PAY" &&
    paymentStatus === "VERIFIED" &&
    (paymentMethod === "GCASH" || paymentMethod === "CASH")
  )
    return "Processing" as const;
  if (stage === "TO_PAY") return "To Pay" as const;
  return "Pending" as const;
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
  stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED" | "CANCELLED",
  paymentStatus: "PENDING" | "VERIFIED" | "DECLINED",
  releaseStatus: "READY" | "RELEASED",
  paymentMethod: PaymentMethod,
) => {
  if (
    stage === "TO_PAY" &&
    paymentStatus === "VERIFIED" &&
    (paymentMethod === "GCASH" || paymentMethod === "CASH")
  ) {
    return "Processing" as const;
  }
  if (
    stage === "COMPLETED" &&
    releaseStatus === "RELEASED" &&
    paymentStatus === "VERIFIED"
  ) {
    return "Released" as const;
  }
  return "Ready" as const;
};

const mapOrderQueueStatus = (
  stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED" | "CANCELLED",
  paymentStatus: "PENDING" | "VERIFIED" | "DECLINED",
  releaseStatus: "READY" | "RELEASED",
  paymentMethod: PaymentMethod,
) => {
  // Cancelled/declined orders are filtered out before queue mapping.
  if (stage === "CANCELLED" || paymentStatus === "DECLINED")
    return "Pending" as const;
  if (
    stage === "COMPLETED" &&
    releaseStatus === "RELEASED" &&
    paymentStatus === "VERIFIED"
  ) {
    return "Released" as const;
  }
  if (stage === "TO_CONFIRM") return "Pending" as const;
  if (stage === "TO_PAY") {
    if (paymentMethod === "CASH") return "To Pay" as const;
    return paymentStatus === "VERIFIED"
      ? ("Preparing" as const)
      : ("To Pay" as const);
  }
  if (stage === "PAID") {
    return releaseStatus === "READY"
      ? ("Ready" as const)
      : ("Preparing" as const);
  }
  return "Pending" as const;
};

const getManilaTodayRange = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(
    parts.find((part) => part.type === "month")?.value ?? "1",
  );
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "1");

  // Asia/Manila is UTC+08:00 (no DST)
  const startUtc = new Date(Date.UTC(year, month - 1, day, -8, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, month - 1, day + 1, -8, 0, 0, 0));

  return { startUtc, endUtc };
};

const getStockStatus = (
  minStock: number,
  currentStock: number,
): StockStatus => {
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
      where: {
        pickupDate: {
          not: null,
        },
        OR: [
          { stage: "TO_CONFIRM" },
          { stage: "TO_PAY" },
          { stage: "CANCELLED" },
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
        payment: {
          select: {
            method: true,
            status: true,
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

        const paymentMethod =
          order.paymentMethod ?? order.payment?.method ?? "CASH";
        const paymentStatus =
          order.paymentStatus ?? order.payment?.status ?? "PENDING";

        return {
          id: order.id,
          orderNum: order.orderNumber,
          name: order.user.fullName,
          items: itemsSummary,
          quantity: order.totalQuantity,
          paymentMethod:
            paymentMethod === "GCASH" ? ("GCash" as const) : ("Cash" as const),
          paymentStatus:
            paymentStatus === "VERIFIED"
              ? ("Verified" as const)
              : paymentStatus === "DECLINED"
                ? ("Declined" as const)
                : ("Pending" as const),
          pickupDate: formatOrderDate(order.pickupDate),
          stage: mapOrderStageToMonitoringStage(
            order.stage,
            paymentStatus,
            paymentMethod,
          ),
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
        pickupDate: {
          not: null,
        },
        OR: [
          {
            stage: "TO_PAY",
            paymentStatus: "VERIFIED",
          },
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
        payment: {
          select: {
            status: true,
          },
        },
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
          status: mapOrderReleaseStatus(
            order.stage,
            order.paymentStatus ?? order.payment?.status ?? "PENDING",
            order.releaseStatus,
            order.paymentMethod ?? "CASH",
          ),
        };
      }),
    };
  });

export const listOrdersQueue = base
  .route({
    method: "GET",
    path: "/orders/queue",
    summary: "list orders for public queue display",
    tags: ["orders"],
  })
  .input(listOrdersQueueInputSchema)
  .output(listOrdersQueueOutputSchema)
  .handler(async () => {
    const { startUtc, endUtc } = getManilaTodayRange();
    const orders = await prisma.order.findMany({
      where: {
        pickupDate: {
          not: null,
        },
        createdAt: {
          gte: startUtc,
          lt: endUtc,
        },
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
        payment: {
          select: {
            method: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return {
      orders: orders
        .map((order) => {
          if (
            order.stage === "CANCELLED" ||
            order.paymentStatus === "DECLINED"
          ) {
            return null;
          }
          const itemsSummary =
            order.itemsSummary?.trim() ||
            order.orderItems.map((item) => item.product.name).join(", ") ||
            "-";

          const paymentMethod =
            order.paymentMethod ?? order.payment?.method ?? "CASH";
          const paymentStatus =
            order.paymentStatus ?? order.payment?.status ?? "PENDING";

          return {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.user.fullName,
            itemsSummary,
            quantity: order.totalQuantity,
            paymentMethod:
              paymentMethod === "GCASH"
                ? ("GCash" as const)
                : ("Cash" as const),
            paymentStatus:
              paymentStatus === "VERIFIED"
                ? ("Verified" as const)
                : ("Pending" as const),
            stage: order.stage,
            releaseStatus: order.releaseStatus,
            queueStatus: mapOrderQueueStatus(
              order.stage,
              paymentStatus,
              order.releaseStatus,
              paymentMethod,
            ),
            createdAt: order.createdAt.toISOString(),
            pickupDate: formatOrderDate(order.pickupDate),
          };
        })
        .filter((order): order is NonNullable<typeof order> => Boolean(order)),
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
        stage: mapOrderStageToTrackStage(
          order.stage,
          order.releaseStatus,
          order.paymentStatus,
        ),
        canSetPickupDate: order.stage === "TO_PAY" && !order.pickupDate,
        items: order.orderItems.map((item) => ({
          id: item.id,
          name: item.product.name,
          quantity: item.quantity,
          size: item.productVariant?.size ?? "-",
          pickupDate: order.pickupDate
            ? order.pickupDate.toISOString().slice(0, 10)
            : "-",
          total: Number(item.unitPrice) * item.quantity,
          image: item.product.imageUrl ?? "",
        })),
      })),
    };
  });

export const checkOrderNumberExists = base
  .route({
    method: "GET",
    path: "/orders/exists",
    summary: "check if an order number exists",
    tags: ["orders"],
  })
  .input(checkOrderNumberExistsInputSchema)
  .output(checkOrderNumberExistsOutputSchema)
  .handler(async ({ input }) => {
    const raw = input.orderNumber.trim().toUpperCase();
    const normalizedOrderNumber = raw.startsWith("ORD-") ? raw : `ORD-${raw}`;

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: normalizedOrderNumber,
      },
      select: {
        id: true,
        orderNumber: true,
        stage: true,
      },
    });

    return {
      exists: Boolean(order),
      normalizedOrderNumber: order?.orderNumber ?? normalizedOrderNumber,
      order: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            stage: order.stage,
          }
        : null,
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

        const selectedVariant = product.variants.find(
          (variant) => variant.size === item.variant,
        );
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

    const orderProductIds = Array.from(
      new Set(itemsWithPricing.map((item) => item.productId)),
    );
    const stockRows = await prisma.stockItem.findMany({
      where: { productId: { in: orderProductIds } },
      select: { productId: true, currentStock: true },
    });

    if (stockRows.length !== orderProductIds.length) {
      throw errors.BAD_REQUEST();
    }

    const stockByProductId = new Map(
      stockRows.map((row) => [row.productId, row.currentStock]),
    );
    const hasPreOrderItems = orderProductIds.some(
      (productId) => (stockByProductId.get(productId) ?? 0) <= 0,
    );
    if (hasPreOrderItems && input.paymentMethod !== "GCASH") {
      throw errors.BAD_REQUEST();
    }
    const requestedPickupDate = input.items[0]?.pickupDate?.trim() ?? "";
    if (!hasPreOrderItems && !requestedPickupDate) {
      throw errors.BAD_REQUEST();
    }

    const totalQuantity = itemsWithPricing.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const totalAmount = itemsWithPricing.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const pickupDateIso = requestedPickupDate
      ? new Date(`${requestedPickupDate}T00:00:00.000Z`).toISOString()
      : null;

    const itemsSummary = itemsWithPricing
      .map((item) => `${item.productName} (${item.variant}) x${item.quantity}`)
      .join(", ");

    const [orderId, paymentId, firstOrderItemId, orderNumber] =
      await Promise.all([
        getNextId("ORDR", "order"),
        getNextId("PAY", "payment"),
        getNextId("OI", "orderItem"),
        getNextOrderNumber(),
      ]);

    const paymentReference =
      input.paymentMethod === "GCASH"
        ? (input.paymentReference?.trim() ?? "")
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
          id: `OI${(
            Number.parseInt(firstOrderItemId.replace("OI", ""), 10) + index
          )
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
        pickupDate: created.pickupDate
          ? created.pickupDate.toISOString()
          : null,
        createdAt: created.createdAt.toISOString(),
        paymentReference,
      },
    };
  });

export const createKioskOrder = base
  .route({
    method: "POST",
    path: "/orders/kiosk",
    summary: "create kiosk order from local cart + kiosk sign-in data",
    tags: ["orders"],
  })
  .input(createKioskOrderInputSchema)
  .output(createKioskOrderOutputSchema)
  .handler(async ({ input, errors }) => {
    const normalizedName = input.customer.fullName.trim();
    const normalizedMobile = input.customer.mobileNumber.trim();
    const normalizedStudentNumber =
      input.customer.studentNumber?.trim() || null;
    const customerType: UserType = input.customer.userType;

    if (!normalizedName || !normalizedMobile) {
      throw errors.BAD_REQUEST();
    }

    let user = null as null | {
      id: string;
      fullName: string;
      mobileNumber: string;
      studentNumber: string | null;
    };
    if (customerType === "STUDENT" && normalizedStudentNumber) {
      user = await prisma.user.findFirst({
        where: {
          type: "STUDENT",
          studentNumber: normalizedStudentNumber,
        },
        select: {
          id: true,
          fullName: true,
          mobileNumber: true,
          studentNumber: true,
        },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          type: customerType,
          fullName: normalizedName,
          mobileNumber: normalizedMobile,
        },
        select: {
          id: true,
          fullName: true,
          mobileNumber: true,
          studentNumber: true,
        },
      });
    }

    if (!user) {
      const nextUserId = await getNextUserId(
        customerType === "STUDENT" ? "KSTU" : "KVIS",
      );
      user = await prisma.user.create({
        data: {
          id: nextUserId,
          type: customerType,
          fullName: normalizedName,
          mobileNumber: normalizedMobile,
          studentNumber:
            customerType === "STUDENT" ? normalizedStudentNumber : null,
          cvsuEmail: null,
          password: null,
        },
        select: {
          id: true,
          fullName: true,
          mobileNumber: true,
          studentNumber: true,
        },
      });
    } else {
      const shouldUpdateStudentNumber =
        customerType === "STUDENT" &&
        normalizedStudentNumber &&
        user.studentNumber !== normalizedStudentNumber;

      if (
        user.fullName !== normalizedName ||
        user.mobileNumber !== normalizedMobile ||
        shouldUpdateStudentNumber
      ) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            fullName: normalizedName,
            mobileNumber: normalizedMobile,
            ...(customerType === "STUDENT" && normalizedStudentNumber
              ? { studentNumber: normalizedStudentNumber }
              : {}),
          },
          select: {
            id: true,
            fullName: true,
            mobileNumber: true,
            studentNumber: true,
          },
        });
      }
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

        const selectedVariant = product.variants.find(
          (variant) => variant.size === item.variant,
        );
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

    const orderProductIds = Array.from(
      new Set(itemsWithPricing.map((item) => item.productId)),
    );
    const stockRows = await prisma.stockItem.findMany({
      where: { productId: { in: orderProductIds } },
      select: { productId: true, currentStock: true },
    });

    if (stockRows.length !== orderProductIds.length) {
      throw errors.BAD_REQUEST();
    }

    const stockByProductId = new Map(
      stockRows.map((row) => [row.productId, row.currentStock]),
    );
    const hasPreOrderItems = orderProductIds.some(
      (productId) => (stockByProductId.get(productId) ?? 0) <= 0,
    );
    // Kiosk mode does not allow pre-orders.
    if (hasPreOrderItems) {
      throw errors.BAD_REQUEST();
    }
    const requestedPickupDate = input.items[0]?.pickupDate?.trim() ?? "";
    if (!requestedPickupDate) {
      throw errors.BAD_REQUEST();
    }

    const totalQuantity = itemsWithPricing.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const totalAmount = itemsWithPricing.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const pickupDateIso = requestedPickupDate
      ? new Date(`${requestedPickupDate}T00:00:00.000Z`).toISOString()
      : null;

    const itemsSummary = itemsWithPricing
      .map((item) => `${item.productName} (${item.variant}) x${item.quantity}`)
      .join(", ");

    const [orderId, paymentId, firstOrderItemId, orderNumber] =
      await Promise.all([
        getNextId("ORDR", "order"),
        getNextId("PAY", "payment"),
        getNextId("OI", "orderItem"),
        getNextOrderNumber(),
      ]);

    const paymentReference =
      input.paymentMethod === "GCASH"
        ? (input.paymentReference?.trim() ?? "")
        : `CASH-${orderNumber}`;

    const created = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          orderNumber,
          userId: user.id,
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
          id: `OI${(
            Number.parseInt(firstOrderItemId.replace("OI", ""), 10) + index
          )
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
        description: `Kiosk order "${createdOrder.orderNumber}" created with ${createdOrder.totalQuantity} item(s).`,
        status: "SUCCESS",
        actorName: "Kiosk",
        actorUserId: user.id,
        orderId: createdOrder.id,
      });

      await createSystemLog(tx, {
        type: "PAYMENT",
        category: "PAYMENT_PENDING",
        description: `Kiosk payment pending for order "${createdOrder.orderNumber}" via ${input.paymentMethod}.`,
        status: "INFO",
        actorName: "Kiosk",
        actorUserId: user.id,
        orderId: createdOrder.id,
        paymentId: createdPayment.id,
      });

      await createStaffNotifications(tx, {
        title: "New Kiosk Order",
        message: `Order ${createdOrder.orderNumber} is now waiting for confirmation.`,
        type: "INFO",
      });

      return createdOrder;
    });

    return {
      order: {
        id: created.id,
        orderNumber: created.orderNumber,
        userId: created.userId,
        paymentMethod: created.paymentMethod ?? input.paymentMethod,
        paymentStatus: created.paymentStatus,
        totalQuantity: created.totalQuantity,
        totalAmount,
        pickupDate: created.pickupDate
          ? created.pickupDate.toISOString()
          : null,
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
        pickupDate: true,
        user: {
          select: {
            fullName: true,
            mobileNumber: true,
          },
        },
        orderItems: {
          select: {
            quantity: true,
            product: {
              select: {
                name: true,
              },
            },
            productVariant: {
              select: {
                size: true,
              },
            },
          },
        },
      },
    });

    if (!existingOrder) {
      throw errors.NOT_FOUND();
    }

    const requestedStage = input.stage ?? existingOrder.stage;
    const requestedReleaseStatus =
      input.releaseStatus ?? existingOrder.releaseStatus;
    const requestedPaymentStatus =
      input.paymentStatus ?? existingOrder.paymentStatus;
    const nextStage = requestedStage;
    const nextReleaseStatus =
      requestedStage === "COMPLETED" ? "RELEASED" : requestedReleaseStatus;
    const nextPaymentStatus =
      requestedStage === "COMPLETED" ? "VERIFIED" : requestedPaymentStatus;
    const shouldDeductStock =
      !(
        existingOrder.stage === "COMPLETED" &&
        existingOrder.releaseStatus === "RELEASED" &&
        existingOrder.paymentStatus === "VERIFIED"
      ) &&
      nextStage === "COMPLETED" &&
      nextReleaseStatus === "RELEASED" &&
      nextPaymentStatus === "VERIFIED";

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

          for (const [
            productId,
            deductQuantity,
          ] of quantityByProductId.entries()) {
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
          stage: nextStage,
          releaseStatus: nextReleaseStatus,
          paymentStatus: nextPaymentStatus,
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

    const isMarkReadyTransition =
      updatedOrder.stage === "PAID" &&
      updatedOrder.releaseStatus === "READY" &&
      (existingOrder.stage !== "PAID" ||
        existingOrder.releaseStatus !== "READY");

    const smsNotification = isMarkReadyTransition
      ? await sendOrderReadySms({
          orderNumber: updatedOrder.orderNumber,
          recipientNumber: existingOrder.user.mobileNumber,
          customerName: existingOrder.user.fullName,
          pickupDate: existingOrder.pickupDate,
          items: existingOrder.orderItems.map((item) => ({
            productName: item.product.name,
            quantity: item.quantity,
            size: item.productVariant?.size ?? null,
          })),
        })
      : undefined;

    const isPreOrderStockConfirmedTransition =
      !existingOrder.pickupDate &&
      existingOrder.stage === "TO_CONFIRM" &&
      updatedOrder.stage === "TO_PAY";

    if (isPreOrderStockConfirmedTransition) {
      await sendPreOrderStockAvailableSms({
        orderNumber: updatedOrder.orderNumber,
        recipientNumber: existingOrder.user.mobileNumber,
        customerName: existingOrder.user.fullName,
      });
    }

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
      smsNotification,
    };
  });

export const markPreOrderStockAvailable = base
  .route({
    method: "PUT",
    path: "/orders/{orderId}/stock-available",
    summary: "mark pre-order as stock available and notify customer",
    tags: ["orders"],
  })
  .input(markPreOrderStockAvailableInputSchema)
  .output(markPreOrderStockAvailableOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingOrder = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        user: {
          select: {
            fullName: true,
            mobileNumber: true,
          },
        },
        orderItems: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });

    if (!existingOrder) {
      throw errors.NOT_FOUND();
    }

    if (existingOrder.pickupDate || existingOrder.stage !== "TO_CONFIRM") {
      throw errors.BAD_REQUEST();
    }

    const requiredByProduct = new Map<string, number>();
    for (const item of existingOrder.orderItems) {
      requiredByProduct.set(
        item.productId,
        (requiredByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const stockRows = await prisma.stockItem.findMany({
      where: {
        productId: { in: Array.from(requiredByProduct.keys()) },
      },
      select: {
        id: true,
        productId: true,
        currentStock: true,
      },
    });

    const stockByProductId = new Map(
      stockRows.map((row) => [row.productId, row.currentStock]),
    );
    const isStockAvailable = Array.from(requiredByProduct.entries()).every(
      ([productId, requiredQty]) =>
        (stockByProductId.get(productId) ?? 0) >= requiredQty,
    );

    if (!isStockAvailable) {
      throw errors.BAD_REQUEST();
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: input.orderId },
        data: {
          stage: "TO_PAY",
        },
      });

      await createSystemLog(tx, {
        type: "ORDER",
        category: "ORDER_RELEASED",
        description: `Pre-order "${order.orderNumber}" marked stock available and moved to TO_PAY.`,
        status: "SUCCESS",
        actorName: input.actorName ?? "Admin",
        actorUserId: existingOrder.userId,
        orderId: order.id,
      });

      await createStaffNotifications(tx, {
        title: "Pre-Order Stock Available",
        message: `Order ${order.orderNumber} is now ready for pickup date selection.`,
        type: "SUCCESS",
      });

      return order;
    });

    const smsNotification = await sendPreOrderStockAvailableSms({
      orderNumber: updatedOrder.orderNumber,
      recipientNumber: existingOrder.user.mobileNumber,
      customerName: existingOrder.user.fullName,
    });

    return {
      success: true,
      message: "Pre-order marked as stock available",
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        stage: updatedOrder.stage,
      },
      smsNotification,
    };
  });

export const listPreOrders = base
  .route({
    method: "GET",
    path: "/orders/admin/pre-orders",
    summary: "list pre-orders waiting for stock availability",
    tags: ["orders"],
  })
  .input(listPreOrdersInputSchema)
  .output(listPreOrdersOutputSchema)
  .handler(async () => {
    const orders = await prisma.order.findMany({
      where: {
        pickupDate: null,
        stage: "TO_CONFIRM",
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
        payment: {
          select: {
            method: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const requiredProductIds = Array.from(
      new Set(
        orders.flatMap((order) => order.orderItems.map((item) => item.productId)),
      ),
    );
    const stockItems = await prisma.stockItem.findMany({
      where: { productId: { in: requiredProductIds } },
      select: { productId: true, currentStock: true },
    });
    const stockByProductId = new Map(
      stockItems.map((item) => [item.productId, item.currentStock]),
    );

    return {
      orders: orders.map((order) => {
        const itemsSummary =
          order.itemsSummary?.trim() ||
          order.orderItems.map((item) => item.product.name).join(", ") ||
          "-";
        const paymentMethod =
          order.paymentMethod ?? order.payment?.method ?? "GCASH";
        const paymentStatus =
          order.paymentStatus ?? order.payment?.status ?? "PENDING";

        const requiredByProduct = new Map<string, number>();
        for (const item of order.orderItems) {
          requiredByProduct.set(
            item.productId,
            (requiredByProduct.get(item.productId) ?? 0) + item.quantity,
          );
        }

        const canMarkStockAvailable = Array.from(requiredByProduct.entries()).every(
          ([productId, requiredQty]) =>
            (stockByProductId.get(productId) ?? 0) >= requiredQty,
        );

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          name: order.user.fullName,
          items: itemsSummary,
          quantity: order.totalQuantity,
          paymentMethod:
            paymentMethod === "CASH" ? ("Cash" as const) : ("GCash" as const),
          paymentStatus:
            paymentStatus === "VERIFIED"
              ? ("Verified" as const)
              : paymentStatus === "DECLINED"
                ? ("Declined" as const)
                : ("Pending" as const),
          createdAt: formatOrderDate(order.createdAt),
          canMarkStockAvailable,
        };
      }),
    };
  });

export const updateOrderPickupDate = base
  .route({
    method: "PUT",
    path: "/orders/{orderId}/pickup-date",
    summary: "set pickup date for an existing order",
    tags: ["orders"],
  })
  .input(updateOrderPickupDateInputSchema)
  .output(updateOrderPickupDateOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingOrder = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        stage: true,
        pickupDate: true,
      },
    });

    if (!existingOrder) {
      throw errors.NOT_FOUND();
    }

    if (existingOrder.userId !== input.userId) {
      throw errors.FORBIDDEN();
    }

    if (existingOrder.stage !== "TO_PAY" || existingOrder.pickupDate) {
      throw errors.BAD_REQUEST();
    }

    const nextPickupDate = new Date(`${input.pickupDate}T00:00:00.000Z`);
    if (Number.isNaN(nextPickupDate.getTime())) {
      throw errors.BAD_REQUEST();
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: input.orderId },
        data: { pickupDate: nextPickupDate },
      });

      await createSystemLog(tx, {
        type: "ORDER",
        category: "ORDER_RELEASED",
        description: `Pickup date set for order "${order.orderNumber}" to ${input.pickupDate}.`,
        status: "SUCCESS",
        actorName: input.actorName ?? "Student",
        actorUserId: input.userId,
        orderId: order.id,
      });

      await createStaffNotifications(tx, {
        title: "Pickup Date Set",
        message: `Order ${order.orderNumber} now has a pickup date: ${input.pickupDate}.`,
        type: "INFO",
      });

      return order;
    });

    return {
      success: true,
      message: "Pickup date set successfully",
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        pickupDate: updatedOrder.pickupDate
          ? updatedOrder.pickupDate.toISOString().slice(0, 10)
          : input.pickupDate,
      },
    };
  });
