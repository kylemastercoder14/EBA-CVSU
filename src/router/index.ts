import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/router/product";
import { listLogs } from "@/router/logs";
import { listStocks, updateStock, updateStocksByProduct } from "@/router/stock";
import { createStaff, deleteStaff, listStaff, updateStaff } from "@/router/staff";
import {
  getStaffSession,
  loginStaff,
  loginStudent,
  resetStudentPassword,
  registerStudent,
  verifyStudentResetIdentity,
  updateStudentProfile,
} from "@/router/auth";
import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/router/notifications";
import {
  checkOrderNumberExists,
  createKioskOrder,
  createOrder,
  listOrdersByUser,
  listOrdersMonitoring,
  listPreOrders,
  listOrdersQueue,
  listOrdersRelease,
  markPreOrderStockAvailable,
  updateOrderPickupDate,
  updateOrderStatus,
} from "@/router/order";
import {
  declinePayment,
  getGcashQr,
  listPayments,
  uploadGcashQr,
  verifyPayment,
} from "@/router/payment";
import { listDashboardSummary } from "@/router/dashboard";
import {
  createReplaceRequest,
  listReplaceRequests,
  updateReplaceRequestStatus,
} from "@/router/replace";

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
    updateByProduct: updateStocksByProduct,
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
    verifyStudentResetIdentity,
    resetStudentPassword,
    updateStudentProfile,
  },
  notifications: {
    list: listNotifications,
    create: createNotification,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
  },
  order: {
    checkExists: checkOrderNumberExists,
    create: createOrder,
    createKiosk: createKioskOrder,
    listByUser: listOrdersByUser,
    listMonitoring: listOrdersMonitoring,
    listPreOrders,
    listQueue: listOrdersQueue,
    listRelease: listOrdersRelease,
    markPreOrderStockAvailable,
    updatePickupDate: updateOrderPickupDate,
    updateStatus: updateOrderStatus,
  },
  payment: {
    list: listPayments,
    getGcashQr,
    verify: verifyPayment,
    decline: declinePayment,
    uploadGcashQr,
  },
  dashboard: {
    summary: listDashboardSummary,
  },
  replace: {
    create: createReplaceRequest,
    list: listReplaceRequests,
    updateStatus: updateReplaceRequestStatus,
  },
};
