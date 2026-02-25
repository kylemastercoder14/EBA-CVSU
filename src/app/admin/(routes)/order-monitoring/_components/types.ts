export type OrderStage = "Pending" | "To Pay" | "Processing" | "Cancelled";
export type PaymentMethod = "GCash" | "Cash";
export type PaymentStatus = "Pending" | "Verified" | "Declined";

export type Order = {
  id: string;
  orderNum: string;
  name: string;
  items: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  pickupDate: string;
  stage: OrderStage;
};
