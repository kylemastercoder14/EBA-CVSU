import z from "zod";

export const createOrderItemInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variant: z.string().min(1, "Variant is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  pickupDate: z.string().min(1, "Pickup date is required"),
});

export const createOrderInputSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    paymentMethod: z.enum(["GCASH", "CASH"]),
    paymentReference: z.string().optional(),
    items: z.array(createOrderItemInputSchema).min(1, "At least one item is required"),
  })
  .superRefine((value, ctx) => {
    if (value.paymentMethod === "GCASH" && !value.paymentReference?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment reference is required for GCash",
        path: ["paymentReference"],
      });
    }
  });

export const createOrderOutputSchema = z.object({
  order: z.object({
    id: z.string(),
    orderNumber: z.string(),
    paymentMethod: z.enum(["GCASH", "CASH"]),
    paymentStatus: z.enum(["PENDING", "VERIFIED"]),
    totalQuantity: z.number(),
    totalAmount: z.number(),
    pickupDate: z.string().nullable(),
    createdAt: z.string(),
    paymentReference: z.string(),
  }),
});

export const listOrdersByUserInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const listOrdersMonitoringInputSchema = z.void();

export const listOrdersMonitoringOutputSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      orderNum: z.string(),
      name: z.string(),
      items: z.string(),
      quantity: z.number(),
      paymentMethod: z.enum(["GCash", "Cash"]),
      paymentStatus: z.enum(["Pending", "Verified"]),
      pickupDate: z.string(),
      stage: z.enum(["To Confirm", "To Pay", "Paid", "Completed"]),
    }),
  ),
});

export const listOrdersReleaseInputSchema = z.void();

export const listOrdersReleaseOutputSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      orderNumber: z.string(),
      name: z.string(),
      items: z.string(),
      quantity: z.number(),
      pickupDate: z.string(),
      status: z.enum(["Ready", "Released"]),
    }),
  ),
});

export const listOrdersByUserOutputSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      orderNumber: z.string(),
      orderedAt: z.string(),
      paymentMethod: z.enum(["GCash", "Cash"]),
      paymentStatus: z.enum(["PENDING", "VERIFIED"]),
      stage: z.enum(["to-pay", "preparing", "ready", "completed"]),
      items: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          quantity: z.number(),
          size: z.string(),
          pickupDate: z.string(),
          total: z.number(),
          image: z.string(),
        }),
      ),
    }),
  ),
});

export const updateOrderStatusInputSchema = z
  .object({
    orderId: z.string().min(1, "Order ID is required"),
    stage: z.enum(["TO_CONFIRM", "TO_PAY", "PAID", "COMPLETED"]).optional(),
    releaseStatus: z.enum(["READY", "RELEASED"]).optional(),
    paymentStatus: z.enum(["PENDING", "VERIFIED"]).optional(),
    actorName: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.stage || value.releaseStatus || value.paymentStatus),
    {
      message: "At least one status field is required",
      path: ["stage"],
    },
  );

export const updateOrderStatusOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  order: z.object({
    id: z.string(),
    orderNumber: z.string(),
    stage: z.enum(["TO_CONFIRM", "TO_PAY", "PAID", "COMPLETED"]),
    releaseStatus: z.enum(["READY", "RELEASED"]),
    paymentStatus: z.enum(["PENDING", "VERIFIED"]),
  }),
});
