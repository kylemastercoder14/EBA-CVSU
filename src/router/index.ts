import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/router/product";
import { listLogs } from "@/router/logs";
import { listStocks, updateStock } from "@/router/stock";
import { createStaff, deleteStaff, listStaff, updateStaff } from "@/router/staff";
import {
  getStaffSession,
  loginStaff,
  loginStudent,
  registerStudent,
  updateStudentProfile,
} from "@/router/auth";
import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/router/notifications";
import {
  createOrder,
  listOrdersByUser,
  listOrdersMonitoring,
  listOrdersRelease,
  updateOrderStatus,
} from "@/router/order";
import { listPayments, verifyPayment } from "@/router/payment";

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
  staff: {
    list: listStaff,
    create: createStaff,
    update: updateStaff,
    delete: deleteStaff,
  },
  auth: {
    login: loginStaff,
    session: getStaffSession,
    registerStudent,
    loginStudent,
    updateStudentProfile,
  },
  notifications: {
    list: listNotifications,
    create: createNotification,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
  },
  order: {
    create: createOrder,
    listByUser: listOrdersByUser,
    listMonitoring: listOrdersMonitoring,
    listRelease: listOrdersRelease,
    updateStatus: updateOrderStatus,
  },
  payment: {
    list: listPayments,
    verify: verifyPayment,
  },
};
