import { prisma } from "@/lib/prisma";
import { sendEbaSmsQueued, type EbaSmsSendResult } from "@/lib/eba-sms";
import { createSystemLog } from "@/lib/system-log";
import { base } from "@/middlewares/base";
import {
  declinePaymentInputSchema,
  declinePaymentOutputSchema,
  listPaymentsInputSchema,
  listPaymentsOutputSchema,
  verifyPaymentInputSchema,
  verifyPaymentOutputSchema,
} from "@/validators/payment";

type PaymentSmsInput = {
  kind: "verified" | "declined";
  orderNumber: string;
  recipientNumber: string;
  customerName: string;
  paymentMethod: "GCASH" | "CASH";
  declineReason?: string | null;
};

type PaymentSmsResult = EbaSmsSendResult;

const sendPaymentStatusSms = async (
  input: PaymentSmsInput,
): Promise<PaymentSmsResult> => {
  const shortReason = input.declineReason?.trim()
    ? input.declineReason.trim().replace(/\s+/g, " ").slice(0, 80)
    : "";
  const message =
    input.kind === "verified"
      ? `Hello, your payment for order #${input.orderNumber} has been successfully verified. We are now processing your order. Thank you!`
      : `Hello, your payment for order #${input.orderNumber} was declined due to ${shortReason || "payment validation failed"}. Please contact EBA support`;

  return sendEbaSmsQueued({
    orderNumber: input.orderNumber,
    recipientNumber: input.recipientNumber,
    message,
  });
};

const toPaymentListItem = (payment: {
  id: string;
  orderId: string;
  amount: number;
  reference: string;
  status: "PENDING" | "VERIFIED" | "DECLINED";
  method: "GCASH" | "CASH";
  order: {
    orderNumber: string;
    user: {
      fullName: string;
    };
  };
}) => ({
  id: payment.id,
  orderId: payment.orderId,
  orderNum: payment.order.orderNumber,
  name: payment.order.user.fullName,
  amount: payment.amount,
  reference: payment.reference,
  status:
    payment.status === "VERIFIED"
      ? ("Verified" as const)
      : payment.status === "DECLINED"
        ? ("Declined" as const)
        : ("Pending" as const),
  paymentMethod:
    payment.method === "CASH" ? ("Cash" as const) : ("GCash" as const),
});

type NotificationClient = {
  staff: {
    findMany: (args: {
      where: { isActive: true };
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
      id: { startsWith: "NOTIF" },
    },
    orderBy: { id: "desc" },
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

export const listPayments = base
  .route({
    method: "GET",
    path: "/payments",
    summary: "list all payments for admin payment management",
    tags: ["payments"],
  })
  .input(listPaymentsInputSchema)
  .output(listPaymentsOutputSchema)
  .handler(async () => {
    const payments = await prisma.payment.findMany({
      include: {
        order: {
          select: {
            orderNumber: true,
            user: {
              select: {
                fullName: true,
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
      payments: payments.map((payment) =>
        toPaymentListItem({
          id: payment.id,
          orderId: payment.orderId,
          amount: Number(payment.amount),
          reference: payment.reference,
          status: payment.status,
          method: payment.method,
          order: payment.order,
        }),
      ),
    };
  });

export const verifyPayment = base
  .route({
    method: "PUT",
    path: "/payments/{paymentId}/verify",
    summary: "verify a payment and update order payment status",
    tags: ["payments"],
  })
  .input(verifyPaymentInputSchema)
  .output(verifyPaymentOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingPayment = await prisma.payment.findUnique({
      where: {
        id: input.paymentId,
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                fullName: true,
                mobileNumber: true,
              },
            },
          },
        },
      },
    });

    if (!existingPayment) {
      throw errors.NOT_FOUND();
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: input.paymentId },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
        include: {
          order: {
            include: {
              user: {
                select: {
                  fullName: true,
                  mobileNumber: true,
                },
              },
            },
          },
        },
      });

      const nextStage =
        payment.order.stage === "TO_CONFIRM" || payment.order.stage === "TO_PAY"
          ? "TO_PAY"
          : payment.order.stage;

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: "VERIFIED",
          stage: nextStage,
        },
      });

      await createSystemLog(tx, {
        type: "PAYMENT",
        category: "PAYMENT_VERIFIED",
        description: `Payment verified for order "${payment.order.orderNumber}" (${payment.reference}).`,
        status: "SUCCESS",
        actorName: input.actorName ?? "Admin",
        actorUserId: payment.order.userId,
        orderId: payment.orderId,
        paymentId: payment.id,
      });

      await createSystemLog(tx, {
        type: "ORDER",
        category: "ORDER_RELEASED",
        description: `Order "${payment.order.orderNumber}" payment marked verified and moved to processing.`,
        status: "INFO",
        actorName: input.actorName ?? "Admin",
        actorUserId: payment.order.userId,
        orderId: payment.orderId,
      });

      await createStaffNotifications(tx, {
        title: "Payment Verified",
        message: `Payment for order ${payment.order.orderNumber} has been verified.`,
        type: "SUCCESS",
      });

      return payment;
    });

    const smsNotification = await sendPaymentStatusSms({
      kind: "verified",
      orderNumber: updatedPayment.order.orderNumber,
      recipientNumber: updatedPayment.order.user.mobileNumber,
      customerName: updatedPayment.order.user.fullName,
      paymentMethod: updatedPayment.method,
    });

    return {
      success: true,
      message: "Payment verified successfully",
      payment: toPaymentListItem({
        id: updatedPayment.id,
        orderId: updatedPayment.orderId,
        amount: Number(updatedPayment.amount),
        reference: updatedPayment.reference,
        status: updatedPayment.status,
        method: updatedPayment.method,
        order: {
          orderNumber: updatedPayment.order.orderNumber,
          user: {
            fullName: updatedPayment.order.user.fullName,
          },
        },
      }),
      smsNotification,
    };
  });

export const declinePayment = base
  .route({
    method: "PUT",
    path: "/payments/{paymentId}/decline",
    summary: "decline a payment and cancel the related order",
    tags: ["payments"],
  })
  .input(declinePaymentInputSchema)
  .output(declinePaymentOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingPayment = await prisma.payment.findUnique({
      where: {
        id: input.paymentId,
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                fullName: true,
                mobileNumber: true,
              },
            },
          },
        },
      },
    });

    if (!existingPayment) {
      throw errors.NOT_FOUND();
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: input.paymentId },
        data: {
          status: "DECLINED",
          verifiedAt: null,
        },
        include: {
          order: {
            include: {
              user: {
                select: {
                  fullName: true,
                  mobileNumber: true,
                },
              },
            },
          },
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: "DECLINED",
          stage: "CANCELLED",
        },
      });

      await createSystemLog(tx, {
        type: "PAYMENT",
        category: "PAYMENT_PENDING",
        description: `Payment declined for order "${payment.order.orderNumber}" (${payment.reference})${input.reason ? `: ${input.reason}` : "."}`,
        status: "WARNING",
        actorName: input.actorName ?? "Admin",
        actorUserId: payment.order.userId,
        orderId: payment.orderId,
        paymentId: payment.id,
      });

      await createSystemLog(tx, {
        type: "ORDER",
        category: "ORDER_RELEASED",
        description: `Order "${payment.order.orderNumber}" was cancelled after payment review was declined.`,
        status: "WARNING",
        actorName: input.actorName ?? "Admin",
        actorUserId: payment.order.userId,
        orderId: payment.orderId,
      });

      await createStaffNotifications(tx, {
        title: "Payment Declined",
        message: `Payment for order ${payment.order.orderNumber} was declined and the order was cancelled.`,
        type: "WARNING",
      });

      return payment;
    });

    const smsNotification = await sendPaymentStatusSms({
      kind: "declined",
      orderNumber: updatedPayment.order.orderNumber,
      recipientNumber: updatedPayment.order.user.mobileNumber,
      customerName: updatedPayment.order.user.fullName,
      paymentMethod: updatedPayment.method,
      declineReason: input.reason ?? null,
    });

    return {
      success: true,
      message: "Payment declined and order cancelled successfully",
      payment: toPaymentListItem({
        id: updatedPayment.id,
        orderId: updatedPayment.orderId,
        amount: Number(updatedPayment.amount),
        reference: updatedPayment.reference,
        status: updatedPayment.status,
        method: updatedPayment.method,
        order: {
          orderNumber: updatedPayment.order.orderNumber,
          user: {
            fullName: updatedPayment.order.user.fullName,
          },
        },
      }),
      smsNotification,
    };
  });
