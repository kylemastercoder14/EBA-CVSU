export type LogType = "Order" | "Payment" | "Activity" | "System";

export type LogCategory =
  | "Order Created"
  | "Payment Verified"
  | "Stock Updated"
  | "Low Stock Alert"
  | "Order Released"
  | "Payment Pending";

export type LogStatus = "Success" | "Info" | "Warning";

export type LogRecord = {
  id: string;
  logId: string;
  type: LogType;
  category: LogCategory;
  description: string;
  user: string;
  timestamp: string;
  status: LogStatus;
};
