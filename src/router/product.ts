import { isLocalProductUploadPath, saveFileLocally } from "@/lib/file-upload";
import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import {
  deleteProductInputSchema,
  deleteProductOutputSchema,
  listProductsInputSchema,
  listProductsOutputSchema,
  NO_VARIANT_SIZE,
  productFormSchema,
  productMutationOutputSchema,
  updateProductSchema,
} from "@/validators/products";
import { unlink } from "fs/promises";
import { basename, join } from "path";

const hasRealVariants = (variants: Array<{ size: string }>) =>
  variants.some((variant) => variant.size !== NO_VARIANT_SIZE);

const getNextStockItemNumber = async () => {
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

  if (!lastStockItem) return 1;
  const currentNumber = parseInt(lastStockItem.id.replace("SI", ""));
  return currentNumber + 1;
};

export const listProducts = base
  .route({
    method: "GET",
    path: "/products",
    summary: "list all products",
    tags: ["products"],
  })
  .input(listProductsInputSchema)
  .output(listProductsOutputSchema)
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
  .output(productMutationOutputSchema)
  .handler(async ({ input, errors }) => {
    const normalizedVariants =
      input.variants.length > 0
        ? input.variants
        : [{ size: NO_VARIANT_SIZE, price: input.basePrice ?? 0 }];

    // Check for duplicate variant sizes
    const sizes = normalizedVariants.map((v) => v.size);
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

    const nextStockItemNumber = await getNextStockItemNumber();

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
      const variantCreateData = normalizedVariants.map((variant, index) => ({
        id: `PV${(nextVariantNumber + index).toString().padStart(3, "0")}`,
        size: variant.size,
        price: variant.price,
      }));

      // Create product with variants
      const newProduct = await tx.product.create({
        data: {
          id: productId,
          name: input.name,
          category: input.category,
          imageUrl: imageUrl, // Use uploaded image URL
          isActive: input.isActive,
          isVisitorOrderable: input.isVisitorOrderable,
          ...(variantCreateData.length > 0
            ? {
                variants: {
                  create: variantCreateData,
                },
              }
            : {}),
        },
        include: {
          variants: true,
        },
      });

      const productHasRealVariants = hasRealVariants(newProduct.variants);
      const stockItems = productHasRealVariants
        ? newProduct.variants
            .filter((variant) => variant.size !== NO_VARIANT_SIZE)
            .map((variant, index) => ({
              id: `SI${(nextStockItemNumber + index).toString().padStart(3, "0")}`,
              productId: newProduct.id,
              productVariantId: variant.id,
              minStock: 0,
              maxStock: 0,
              currentStock: 0,
              status: "CRITICAL" as const,
            }))
        : [
            {
              id: `SI${nextStockItemNumber.toString().padStart(3, "0")}`,
              productId: newProduct.id,
              productVariantId: null,
              minStock: 0,
              maxStock: 0,
              currentStock: 0,
              status: "CRITICAL" as const,
            },
          ];

      await tx.stockItem.createMany({
        data: stockItems,
      });

      // Create system log for product creation
      await tx.systemLog.create({
        data: {
          id: logId,
          logCode: logCode,
          type: "SYSTEM",
          category: "STOCK_UPDATED",
          description: `Product "${input.name}" created with ${input.variants.length} variant(s). ${stockItems.length} stock row(s) initialized with 0 stock.${imageUrl ? " Image uploaded." : ""}`,
          status: "SUCCESS",
          actorName: "System",
          productId: newProduct.id,
          stockItemId: stockItems[0]?.id,
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
  .output(productMutationOutputSchema)
  .handler(async ({ input, errors }) => {
    const normalizedVariants =
      input.variants.length > 0
        ? input.variants
        : [{ size: NO_VARIANT_SIZE, price: input.basePrice ?? 0 }];

    const existingProduct = await prisma.product.findUnique({
      where: { id: input.id },
      include: { variants: true },
    });

    if (!existingProduct) {
      throw errors.NOT_FOUND();
    }

    const existingStockItems = await prisma.stockItem.findMany({
      where: { productId: input.id },
      include: {
        productVariant: {
          select: { size: true },
        },
      },
    });

    // Check for duplicate variant sizes
    const sizes = normalizedVariants.map((v) => v.size);
    const duplicateSizes = sizes.filter(
      (size, index) => sizes.indexOf(size) !== index,
    );

    if (duplicateSizes.length > 0) {
      throw errors.BAD_REQUEST();
    }

    // Keep existing image unless a new one is uploaded.
    let imageUrl = existingProduct.imageUrl;
    const hasNewImage =
      typeof File !== "undefined" && input.imageUrl instanceof File;
    if (hasNewImage && input.imageUrl) {
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
    const nextStockItemNumber = await getNextStockItemNumber();

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const variantCreateData = normalizedVariants.map((variant, index) => ({
        id: `PV${(nextVariantNumber + index).toString().padStart(3, "0")}`,
        size: variant.size,
        price: variant.price,
      }));

      const previousProductStock =
        existingStockItems.find((stock) => !stock.productVariantId) ?? null;
      const previousStockBySize = new Map(
        existingStockItems
          .filter((stock) => stock.productVariant?.size)
          .map((stock) => [stock.productVariant!.size, stock]),
      );
      const totalPreviousVariantStock = existingStockItems
        .filter((stock) => stock.productVariantId)
        .reduce((sum, stock) => sum + stock.currentStock, 0);

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
            ...(variantCreateData.length > 0
              ? {
                  create: variantCreateData,
                }
              : {}),
          },
        },
        include: {
          variants: true,
        },
      });

      await tx.stockItem.deleteMany({
        where: {
          productId: product.id,
        },
      });

      const productHasRealVariants = hasRealVariants(product.variants);
      const stockItems = productHasRealVariants
        ? product.variants
            .filter((variant) => variant.size !== NO_VARIANT_SIZE)
            .map((variant, index) => {
              const previousStock = previousStockBySize.get(variant.size);
              return {
                id: `SI${(nextStockItemNumber + index).toString().padStart(3, "0")}`,
                productId: product.id,
                productVariantId: variant.id,
                minStock: previousStock?.minStock ?? 0,
                maxStock: previousStock?.maxStock ?? 0,
                currentStock: previousStock?.currentStock ?? 0,
                status: previousStock?.status ?? "CRITICAL",
              };
            })
        : [
            {
              id: `SI${nextStockItemNumber.toString().padStart(3, "0")}`,
              productId: product.id,
              productVariantId: null,
              minStock: previousProductStock?.minStock ?? 0,
              maxStock: previousProductStock?.maxStock ?? 0,
              currentStock:
                previousProductStock?.currentStock ?? totalPreviousVariantStock,
              status: previousProductStock?.status ?? "CRITICAL",
            },
          ];

      await tx.stockItem.createMany({
        data: stockItems,
      });

      await tx.systemLog.create({
        data: {
          id: logId,
          logCode,
          type: "SYSTEM",
          category: "STOCK_UPDATED",
          description: `Product "${existingProduct.name}" updated to "${product.name}" with ${product.variants.length} variant(s). ${stockItems.length} stock row(s) synchronized.`,
          status: "SUCCESS",
          actorName: "System",
          productId: product.id,
        },
      });

      return product;
    });

    if (
      hasNewImage &&
      isLocalProductUploadPath(existingProduct.imageUrl) &&
      existingProduct.imageUrl &&
      updatedProduct.imageUrl &&
      existingProduct.imageUrl !== updatedProduct.imageUrl
    ) {
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
        console.error("Failed to delete old product image file:", error);
      }
    }

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
  .input(deleteProductInputSchema)
  .output(deleteProductOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingProduct = await prisma.product.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
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

    const hasOrderHistory = existingProduct._count.orderItems > 0;

    try {
      if (hasOrderHistory) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: input.id },
            data: {
              isActive: false,
              isVisitorOrderable: false,
            },
          });

          await tx.systemLog.create({
            data: {
              id: logId,
              logCode,
              type: "SYSTEM",
              category: "STOCK_UPDATED",
              description: `Product "${existingProduct.name}" is linked to existing orders and was archived (set inactive and not visitor orderable).`,
              status: "SUCCESS",
              actorName: "System",
              productId: input.id,
            },
          });
        });

        return {
          success: true,
          id: input.id,
          message:
            `Product "${existingProduct.name}" has existing orders, so it was archived instead of deleted.`,
        };
      }

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

      if (isLocalProductUploadPath(existingProduct.imageUrl) && existingProduct.imageUrl) {
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

      return {
        success: true,
        id: input.id,
        message: `Product "${existingProduct.name}" deleted successfully`,
      };
    } catch (error) {
      console.error("Error deleting product:", error);
      throw errors.BAD_REQUEST();
    }
  });
