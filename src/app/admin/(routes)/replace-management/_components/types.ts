export type ReplaceRequestStatus = "Pending" | "Approved" | "Rejected";

export type ReplaceRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: string;
  status: ReplaceRequestStatus;
  createdAt: string;
};
