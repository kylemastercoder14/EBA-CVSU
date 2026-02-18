export type KioskPaymentMethod = "cash" | "gcash";

export type KioskReceiptItem = {
  productId: string;
  productName: string;
  variant: string;
  pickupDate: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type KioskReceiptPayload = {
  orderNumber: string;
  issuedAt: string;
  customerName: string;
  mobileNumber: string;
  paymentMethod: KioskPaymentMethod;
  paymentReference: string | null;
  items: KioskReceiptItem[];
  total: number;
};
