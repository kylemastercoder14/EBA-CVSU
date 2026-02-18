import z from "zod";

export const createReplaceRequestInputSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  reason: z.enum(["WRONG_ITEM", "DEFECTIVE_ITEM", "WRONG_SIZE", "CHANGE_OF_MIND"]),
});

export const createReplaceRequestOutputSchema = z.object({
  replaceRequest: z.object({
    id: z.string(),
    orderId: z.string(),
    orderNumber: z.string(),
    reason: z.enum(["WRONG_ITEM", "DEFECTIVE_ITEM", "WRONG_SIZE", "CHANGE_OF_MIND"]),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
    createdAt: z.string(),
  }),
});

export const listReplaceRequestsInputSchema = z.void();

export const listReplaceRequestsOutputSchema = z.object({
  replaceRequests: z.array(
    z.object({
      id: z.string(),
      orderId: z.string(),
      orderNumber: z.string(),
      reason: z.enum(["WRONG_ITEM", "DEFECTIVE_ITEM", "WRONG_SIZE", "CHANGE_OF_MIND"]),
      status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
      createdAt: z.string(),
    }),
  ),
});

export const updateReplaceRequestStatusInputSchema = z.object({
  replaceRequestId: z.string().min(1, "Replace request ID is required"),
  status: z.enum(["APPROVED", "REJECTED"]),
  actorName: z.string().optional(),
});

export const updateReplaceRequestStatusOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  replaceRequest: z.object({
    id: z.string(),
    orderId: z.string(),
    orderNumber: z.string(),
    reason: z.enum(["WRONG_ITEM", "DEFECTIVE_ITEM", "WRONG_SIZE", "CHANGE_OF_MIND"]),
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
    createdAt: z.string(),
  }),
});
