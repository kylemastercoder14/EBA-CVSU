import z from "zod";

export const NO_VARIANT_SIZE = "No Size";

export const productVariantSchema = z.object({
  size: z.string().min(1, "Size is required"),
  price: z.number().positive("Price must be greater than 0"),
});

export const productFormSchema = z
  .object({
    name: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    isActive: z.boolean(),
    isVisitorOrderable: z.boolean(),
    imageUrl: z.instanceof(File).optional(),
    basePrice: z.number().positive("Price must be greater than 0").optional(),
    variants: z.array(productVariantSchema),
  })
  .superRefine((data, ctx) => {
    if (data.variants.length === 0 && (!data.basePrice || data.basePrice <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["basePrice"],
        message: "Price is required when no variants are added",
      });
    }
  });

export const updateProductSchema = productFormSchema.extend({
  id: z.string().min(1, "Product ID is required"),
});

export const listProductsInputSchema = z.void();

export const productListItemSchema = z.object({
  id: z.string(),
  image: z.string(),
  name: z.string(),
  category: z.string(),
  isActive: z.boolean(),
  isVisitorOrderable: z.boolean(),
  variants: z.array(
    z.object({
      size: z.string(),
      price: z.number(),
    }),
  ),
});

export const listProductsOutputSchema = z.object({
  products: z.array(productListItemSchema),
});

export const productMutationOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
  isVisitorOrderable: z.boolean(),
  variants: z.array(
    z.object({
      id: z.string(),
      size: z.string(),
      price: z.number(),
    }),
  ),
});

export const deleteProductInputSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
});

export const deleteProductOutputSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  message: z.string(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
