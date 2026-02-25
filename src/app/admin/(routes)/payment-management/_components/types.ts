export type PaymentStatus = "Pending" | "Verified" | "Declined";

export type Payment = {
  id: string;
  orderNum: string;
  name: string;
  amount: number;
  reference: string;
  status: PaymentStatus;
  paymentMethod: "GCash" | "Cash";
};
