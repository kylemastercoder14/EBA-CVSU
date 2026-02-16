export type OrderStage = "To Confirm" | "To Pay" | "Paid" | "Completed";
export type PaymentMethod = "GCash" | "Cash";
export type PaymentStatus = "Pending" | "Verified";

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
