import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import {
  createReplaceRequestInputSchema,
  createReplaceRequestOutputSchema,
  listReplaceRequestsInputSchema,
  listReplaceRequestsOutputSchema,
  updateReplaceRequestStatusInputSchema,
  updateReplaceRequestStatusOutputSchema,
} from "@/validators/replace";

const getNextReplaceRequestId = async () => {
  const last = await prisma.replaceRequest.findFirst({
    where: {
      id: {
        startsWith: "RPL",
      },
    },
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });

  const numeric = last ? Number.parseInt(last.id.replace("RPL", ""), 10) : 0;
  const next = Number.isNaN(numeric) ? 1 : numeric + 1;
  return `RPL${next.toString().padStart(4, "0")}`;
};

export const createReplaceRequest = base
  .route({
    method: "POST",
    path: "/replace-requests",
    summary: "create kiosk replace request by order number",
    tags: ["replace"],
  })
  .input(createReplaceRequestInputSchema)
  .output(createReplaceRequestOutputSchema)
  .handler(async ({ input, errors }) => {
    const normalized = input.orderNumber.trim().toUpperCase();
    const normalizedOrderNumber = normalized.startsWith("ORD-")
      ? normalized
      : `ORD-${normalized}`;

    const order = await prisma.order.findUnique({
      where: {
        orderNumber: normalizedOrderNumber,
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (!order) {
      throw errors.NOT_FOUND();
    }

    const replaceRequestId = await getNextReplaceRequestId();
    const created = await prisma.replaceRequest.create({
      data: {
        id: replaceRequestId,
        orderId: order.id,
        reason: input.reason,
        status: "PENDING",
      },
    });

    return {
      replaceRequest: {
        id: created.id,
        orderId: created.orderId,
        orderNumber: order.orderNumber,
        reason: created.reason,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
    };
  });

export const listReplaceRequests = base
  .route({
    method: "GET",
    path: "/replace-requests",
    summary: "list replace requests for admin",
    tags: ["replace"],
  })
  .input(listReplaceRequestsInputSchema)
  .output(listReplaceRequestsOutputSchema)
  .handler(async () => {
    const rows = await prisma.replaceRequest.findMany({
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      replaceRequests: rows.map((row) => ({
        id: row.id,
        orderId: row.orderId,
        orderNumber: row.order.orderNumber,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });

export const updateReplaceRequestStatus = base
  .route({
    method: "PUT",
    path: "/replace-requests/{replaceRequestId}/status",
    summary: "update replace request status",
    tags: ["replace"],
  })
  .input(updateReplaceRequestStatusInputSchema)
  .output(updateReplaceRequestStatusOutputSchema)
  .handler(async ({ input, errors }) => {
    const existing = await prisma.replaceRequest.findUnique({
      where: { id: input.replaceRequestId },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    if (!existing) {
      throw errors.NOT_FOUND();
    }

    const updated = await prisma.replaceRequest.update({
      where: { id: input.replaceRequestId },
      data: { status: input.status },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Replace request ${input.status.toLowerCase()} successfully.`,
      replaceRequest: {
        id: updated.id,
        orderId: updated.orderId,
        orderNumber: updated.order.orderNumber,
        reason: updated.reason,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  });
