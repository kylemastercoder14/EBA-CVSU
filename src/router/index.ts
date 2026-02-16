import { createProduct, listProducts } from "@/router/product";

export const router = {
  product: {
    list: listProducts,
    create: createProduct,
  },
};
