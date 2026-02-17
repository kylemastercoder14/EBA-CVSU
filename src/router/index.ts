import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/router/product";
import { listLogs } from "@/router/logs";
import { listStocks, updateStock } from "@/router/stock";

export const router = {
  product: {
    list: listProducts,
    create: createProduct,
    update: updateProduct,
    delete: deleteProduct,
  },
  stock: {
    list: listStocks,
    update: updateStock,
  },
  logs: {
    list: listLogs,
  },
};
