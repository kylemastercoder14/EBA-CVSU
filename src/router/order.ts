import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import {
  createOrderInputSchema,
  createOrderOutputSchema,
  listOrdersByUserInputSchema,
  listOrdersByUserOutputSchema,
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

const mapOrderStageToTrackStage = (stage: "TO_CONFIRM" | "TO_PAY" | "PAID" | "COMPLETED", releaseStatus: "READY" | "RELEASED") => {
  if (stage === "COMPLETED" || releaseStatus === "RELEASED") return "completed" as const;
  if (stage === "PAID" && releaseStatus === "READY") return "ready" as const;
  if (stage === "TO_PAY") return "preparing" as const;
  return "to-pay" as const;
};

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

      await tx.payment.create({
        data: {
          id: paymentId,
          orderId: createdOrder.id,
          amount: totalAmount,
          reference: paymentReference,
          method: input.paymentMethod,
          status: "PENDING",
        },
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
