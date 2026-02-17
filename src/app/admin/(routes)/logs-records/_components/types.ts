import { LogCategory, LogStatus, LogType } from "@/generated/prisma";

export type LogRecord = {
  id: string;
  logCode: string;
  type: LogType;
  category: LogCategory;
  description: string;
  actorName: string;
  status: LogStatus;
  createdAt: string;
};
