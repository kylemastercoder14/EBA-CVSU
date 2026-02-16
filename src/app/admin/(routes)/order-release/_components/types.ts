export type OrderStatus = "Ready" | "Released";

export type Order = {
  id: string;
  orderNumber: string;
  name: string;
  items: string;
  quantity: number;
  pickupDate: string;
  status: OrderStatus;
};
