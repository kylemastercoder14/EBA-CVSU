export type PaymentStatus = "Pending" | "Verified";

export type Payment = {
  id: string;
  orderNum: string;
  name: string;
  amount: number;
  reference: string;
  status: PaymentStatus;
  paymentMethod: "GCash" | "Cash";
};
