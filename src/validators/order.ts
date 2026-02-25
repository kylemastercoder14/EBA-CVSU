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

export const createKioskOrderInputSchema = z
  .object({
    customer: z.object({
      fullName: z.string().min(1, "Full name is required"),
      mobileNumber: z.string().min(1, "Mobile number is required"),
      studentNumber: z.string().optional(),
      userType: z.enum(["STUDENT", "VISITOR"]),
    }),
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
    paymentStatus: z.enum(["PENDING", "VERIFIED", "DECLINED"]),
    totalQuantity: z.number(),
    totalAmount: z.number(),
    pickupDate: z.string().nullable(),
    createdAt: z.string(),
    paymentReference: z.string(),
  }),
});

export const createKioskOrderOutputSchema = z.object({
  order: z.object({
    id: z.string(),
    orderNumber: z.string(),
    userId: z.string(),
    paymentMethod: z.enum(["GCASH", "CASH"]),
    paymentStatus: z.enum(["PENDING", "VERIFIED", "DECLINED"]),
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

export const checkOrderNumberExistsInputSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
});

export const checkOrderNumberExistsOutputSchema = z.object({
  exists: z.boolean(),
  normalizedOrderNumber: z.string(),
      order: z
    .object({
      id: z.string(),
      orderNumber: z.string(),
      stage: z.enum(["TO_CONFIRM", "TO_PAY", "PAID", "COMPLETED", "CANCELLED"]),
    })
    .nullable(),
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
      paymentStatus: z.enum(["Pending", "Verified", "Declined"]),
      pickupDate: z.string(),
      stage: z.enum(["Pending", "To Pay", "Processing", "Cancelled"]),
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
      status: z.enum(["Processing", "Ready", "Released"]),
    }),
  ),
});

export const listOrdersQueueInputSchema = z.void();

export const listOrdersQueueOutputSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      orderNumber: z.string(),
      customerName: z.string(),
      itemsSummary: z.string(),
      quantity: z.number(),
      paymentMethod: z.enum(["GCash", "Cash"]),
      paymentStatus: z.enum(["Pending", "Verified", "Declined"]),
      stage: z.enum(["TO_CONFIRM", "TO_PAY", "PAID", "COMPLETED", "CANCELLED"]),
      releaseStatus: z.enum(["READY", "RELEASED"]),
      queueStatus: z.enum([
        "Pending",
        "To Pay",
        "Preparing",
        "Ready",
        "Released",
      ]),
      createdAt: z.string(),
      pickupDate: z.string(),
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
      paymentStatus: z.enum(["PENDING", "VERIFIED", "DECLINED"]),
      stage: z.enum(["to-pay", "preparing", "ready", "completed", "cancelled"]),
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
    stage: z.enum(["TO_CONFIRM", "TO_PAY", "PAID", "COMPLETED", "CANCELLED"]).optional(),
    releaseStatus: z.enum(["READY", "RELEASED"]).optional(),
    paymentStatus: z.enum(["PENDING", "VERIFIED", "DECLINED"]).optional(),
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
    stage: z.enum(["TO_CONFIRM", "TO_PAY", "PAID", "COMPLETED", "CANCELLED"]),
    releaseStatus: z.enum(["READY", "RELEASED"]),
    paymentStatus: z.enum(["PENDING", "VERIFIED", "DECLINED"]),
  }),
});
