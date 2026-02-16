import { saveFileLocally } from "@/lib/file-upload";
import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import { productFormSchema } from "@/validators/products";
import { z } from "zod";

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
          status: "NORMAL",
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
      variants: product.variants.map((v) => ({
        id: v.id,
        size: v.size,
        price: Number(v.price),
      })),
    };
  });
