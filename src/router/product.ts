import { saveFileLocally } from "@/lib/file-upload";
import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import { productFormSchema } from "@/validators/products";
import { unlink } from "fs/promises";
import { basename, join } from "path";
import { z } from "zod";

const updateProductSchema = productFormSchema.extend({
  id: z.string().min(1, "Product ID is required"),
});

export const listProducts = base
  .route({
    method: "GET",
    path: "/products",
    summary: "list all products",
    tags: ["products"],
  })
  .input(z.void())
  .output(
    z.object({
      products: z.array(
        z.object({
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
        }),
      ),
    }),
  )
  .handler(async () => {
    const products = await prisma.product.findMany({
      include: {
        variants: true,
      },
    });

    return {
      products: products.map((product) => ({
        id: product.id,
        image: product.imageUrl || "", // Fix: was returning category
        name: product.name,
        category: product.category,
        isActive: product.isActive,
        isVisitorOrderable: product.isVisitorOrderable,
        variants: product.variants.map((v) => ({
          size: v.size,
          price: Number(v.price),
        })),
      })),
    };
  });

export const createProduct = base
  .route({
    method: "POST",
    path: "/products",
    summary: "create a new product",
    tags: ["products"],
  })
  .input(productFormSchema)
  .output(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      imageUrl: z.string().nullable(),
      variants: z.array(
        z.object({
          id: z.string(),
          size: z.string(),
          price: z.number(),
        }),
      ),
    }),
  )
  .handler(async ({ input, errors }) => {
    // Check for duplicate variant sizes
    const sizes = input.variants.map((v) => v.size);
    const duplicateSizes = sizes.filter(
      (size, index) => sizes.indexOf(size) !== index,
    );

    if (duplicateSizes.length > 0) {
      throw errors.BAD_REQUEST();
    }

    // Upload image to local storage if provided
    let imageUrl: string | null = null;
    if (input.imageUrl) {
      try {
        imageUrl = await saveFileLocally(input.imageUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        throw errors.INTERNAL_SERVER_ERROR();
      }
    }

    // Generate next Product ID
    const lastProduct = await prisma.product.findFirst({
      where: {
        id: {
          startsWith: "P",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextProductNumber = 1;
    if (lastProduct) {
      const currentNumber = parseInt(lastProduct.id.replace("P", ""));
      nextProductNumber = currentNumber + 1;
    }
    const productId = `P${nextProductNumber.toString().padStart(3, "0")}`;

    // Generate next ProductVariant IDs
    const lastVariant = await prisma.productVariant.findFirst({
      where: {
        id: {
          startsWith: "PV",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextVariantNumber = 1;
    if (lastVariant) {
      const currentNumber = parseInt(lastVariant.id.replace("PV", ""));
      nextVariantNumber = currentNumber + 1;
    }

    // Generate next StockItem ID
    const lastStockItem = await prisma.stockItem.findFirst({
      where: {
        id: {
          startsWith: "SI",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextStockItemNumber = 1;
    if (lastStockItem) {
      const currentNumber = parseInt(lastStockItem.id.replace("SI", ""));
      nextStockItemNumber = currentNumber + 1;
    }
    const stockItemId = `SI${nextStockItemNumber.toString().padStart(3, "0")}`;

    // Generate next SystemLog ID
    const lastLog = await prisma.systemLog.findFirst({
      where: {
        id: {
          startsWith: "LOG",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextLogNumber = 1;
    if (lastLog) {
      const currentNumber = parseInt(lastLog.id.replace("LOG", ""));
      nextLogNumber = currentNumber + 1;
    }
    const logId = `LOG${nextLogNumber.toString().padStart(3, "0")}`;

    // Generate unique log code (e.g., LOG001-20260216-143022)
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const logCode = `${logId}-${timestamp}`;

    // Create product with variants, stock item, and log in a transaction
    const product = await prisma.$transaction(async (tx) => {
      // Create product with variants
      const newProduct = await tx.product.create({
        data: {
          id: productId,
          name: input.name,
          category: input.category,
          imageUrl: imageUrl, // Use uploaded image URL
          isActive: input.isActive,
          isVisitorOrderable: input.isVisitorOrderable,
          variants: {
            create: input.variants.map((variant, index) => ({
              id: `PV${(nextVariantNumber + index).toString().padStart(3, "0")}`,
              size: variant.size,
              price: variant.price,
            })),
          },
        },
        include: {
          variants: true,
        },
      });

      // Create stock item for the product
      await tx.stockItem.create({
        data: {
          id: stockItemId,
          productId: newProduct.id,
          minStock: 0,
          maxStock: 0,
          currentStock: 0,
          status: "CRITICAL",
        },
      });

      // Create system log for product creation
      await tx.systemLog.create({
        data: {
          id: logId,
          logCode: logCode,
          type: "SYSTEM",
          category: "STOCK_UPDATED",
          description: `Product "${input.name}" created with ${input.variants.length} variant(s). Stock item initialized with 0 stock.${imageUrl ? " Image uploaded." : ""}`,
          status: "SUCCESS",
          actorName: "System",
          productId: newProduct.id,
          stockItemId: stockItemId,
        },
      });

      return newProduct;
    });

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      isVisitorOrderable: product.isVisitorOrderable,
      variants: product.variants.map((v) => ({
        id: v.id,
        size: v.size,
        price: Number(v.price),
      })),
    };
  });

export const updateProduct = base
  .route({
    method: "PUT",
    path: "/products/{id}",
    summary: "update an existing product",
    tags: ["products"],
  })
  .input(updateProductSchema)
  .output(
    z.object({
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
    }),
  )
  .handler(async ({ input, errors }) => {
    const existingProduct = await prisma.product.findUnique({
      where: { id: input.id },
      include: { variants: true },
    });

    if (!existingProduct) {
      throw errors.NOT_FOUND();
    }

    // Check for duplicate variant sizes
    const sizes = input.variants.map((v) => v.size);
    const duplicateSizes = sizes.filter(
      (size, index) => sizes.indexOf(size) !== index,
    );

    if (duplicateSizes.length > 0) {
      throw errors.BAD_REQUEST();
    }

    // Keep existing image unless a new one is uploaded
    let imageUrl = existingProduct.imageUrl;
    if (input.imageUrl) {
      try {
        imageUrl = await saveFileLocally(input.imageUrl);
      } catch (error) {
        console.error("Error uploading image:", error);
        throw errors.INTERNAL_SERVER_ERROR();
      }
    }

    // Generate next ProductVariant IDs for replacement variants
    const lastVariant = await prisma.productVariant.findFirst({
      where: {
        id: {
          startsWith: "PV",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextVariantNumber = 1;
    if (lastVariant) {
      const currentNumber = parseInt(lastVariant.id.replace("PV", ""));
      nextVariantNumber = currentNumber + 1;
    }

    // Generate next SystemLog ID
    const lastLog = await prisma.systemLog.findFirst({
      where: {
        id: {
          startsWith: "LOG",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextLogNumber = 1;
    if (lastLog) {
      const currentNumber = parseInt(lastLog.id.replace("LOG", ""));
      nextLogNumber = currentNumber + 1;
    }
    const logId = `LOG${nextLogNumber.toString().padStart(3, "0")}`;

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const logCode = `${logId}-${timestamp}`;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: input.id },
        data: {
          name: input.name,
          category: input.category,
          imageUrl,
          isActive: input.isActive,
          isVisitorOrderable: input.isVisitorOrderable,
          variants: {
            deleteMany: {},
            create: input.variants.map((variant, index) => ({
              id: `PV${(nextVariantNumber + index).toString().padStart(3, "0")}`,
              size: variant.size,
              price: variant.price,
            })),
          },
        },
        include: {
          variants: true,
        },
      });

      await tx.systemLog.create({
        data: {
          id: logId,
          logCode,
          type: "SYSTEM",
          category: "STOCK_UPDATED",
          description: `Product "${existingProduct.name}" updated to "${product.name}" with ${product.variants.length} variant(s).`,
          status: "SUCCESS",
          actorName: "System",
          productId: product.id,
        },
      });

      return product;
    });

    return {
      id: updatedProduct.id,
      name: updatedProduct.name,
      category: updatedProduct.category,
      imageUrl: updatedProduct.imageUrl,
      isActive: updatedProduct.isActive,
      isVisitorOrderable: updatedProduct.isVisitorOrderable,
      variants: updatedProduct.variants.map((v) => ({
        id: v.id,
        size: v.size,
        price: Number(v.price),
      })),
    };
  });

export const deleteProduct = base
  .route({
    method: "DELETE",
    path: "/products/{id}",
    summary: "delete a product",
    tags: ["products"],
  })
  .input(
    z.object({
      id: z.string().min(1, "Product ID is required"),
    }),
  )
  .output(
    z.object({
      success: z.boolean(),
      id: z.string(),
      message: z.string(),
    }),
  )
  .handler(async ({ input, errors }) => {
    const existingProduct = await prisma.product.findUnique({
      where: { id: input.id },
      select: { id: true, name: true, imageUrl: true },
    });

    if (!existingProduct) {
      throw errors.NOT_FOUND();
    }

    // Generate next SystemLog ID
    const lastLog = await prisma.systemLog.findFirst({
      where: {
        id: {
          startsWith: "LOG",
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextLogNumber = 1;
    if (lastLog) {
      const currentNumber = parseInt(lastLog.id.replace("LOG", ""));
      nextLogNumber = currentNumber + 1;
    }
    const logId = `LOG${nextLogNumber.toString().padStart(3, "0")}`;

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const logCode = `${logId}-${timestamp}`;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.product.delete({
          where: { id: input.id },
        });

        await tx.systemLog.create({
          data: {
            id: logId,
            logCode,
            type: "SYSTEM",
            category: "STOCK_UPDATED",
            description: `Product "${existingProduct.name}" was deleted.`,
            status: "SUCCESS",
            actorName: "System",
          },
        });
      });

      if (existingProduct.imageUrl) {
        const filename = basename(existingProduct.imageUrl);
        const imagePath = join(
          process.cwd(),
          "public",
          "uploads",
          "products",
          filename,
        );

        try {
          await unlink(imagePath);
        } catch (error) {
          console.error("Failed to delete product image file:", error);
        }
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      throw errors.BAD_REQUEST();
    }

    return {
      success: true,
      id: input.id,
      message: `Product "${existingProduct.name}" deleted successfully`,
    };
  });
