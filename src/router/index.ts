import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/router/product";

export const router = {
  product: {
    list: listProducts,
    create: createProduct,
    update: updateProduct,
    delete: deleteProduct,
  },
};
