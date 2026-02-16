import z from "zod";

export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.instanceof(File).optional(),
  variants: z
    .array(
      z.object({
        size: z.string().min(1, "Size is required"),
        price: z.number().positive("Price must be greater than 0"),
      }),
    )
    .min(1, "At least one variant is required"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
