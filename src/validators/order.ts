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
