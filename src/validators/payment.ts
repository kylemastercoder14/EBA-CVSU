import { z } from "zod";

export const listPaymentsInputSchema = z.void();

export const paymentListItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderNum: z.string(),
  name: z.string(),
  amount: z.number(),
  reference: z.string(),
  status: z.enum(["Pending", "Verified", "Declined"]),
  paymentMethod: z.enum(["GCash", "Cash"]),
});

export const listPaymentsOutputSchema = z.object({
  payments: z.array(paymentListItemSchema),
});

export const verifyPaymentInputSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  actorName: z.string().min(1).optional(),
});

export const declinePaymentInputSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  actorName: z.string().min(1).optional(),
  reason: z.string().trim().min(1).optional(),
});

export const verifyPaymentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  payment: paymentListItemSchema,
  smsNotification: z
    .object({
      attempted: z.boolean(),
      sent: z.boolean(),
      recipientNumber: z.string().optional(),
      error: z.string().optional(),
      statusCode: z.number().optional(),
    })
    .optional(),
});

export const declinePaymentOutputSchema = verifyPaymentOutputSchema;

export const uploadGcashQrInputSchema = z.object({
  image: z.instanceof(File),
  actorName: z.string().min(1).optional(),
});

export const uploadGcashQrOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const getGcashQrInputSchema = z.void();

export const getGcashQrOutputSchema = z.object({
  imageUrl: z.string(),
});
