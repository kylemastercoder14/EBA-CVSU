import {
  type LogCategory,
  type LogStatus,
  type LogType,
} from "@/generated/prisma";
import { randomBytes } from "crypto";

type LogClient = {
  systemLog: {
    create: (args: {
      data: {
        id: string;
        logCode: string;
        type: LogType;
        category: LogCategory;
        description: string;
        status: LogStatus;
        actorName?: string;
        actorUserId?: string;
        orderId?: string;
        paymentId?: string;
        productId?: string;
        stockItemId?: string;
      };
    }) => Promise<unknown>;
  };
};

const createLogMeta = () => {
  const now = new Date();
  const idTimestamp = now
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 17);
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  const logId = `LOG${idTimestamp}${suffix}`;
  const codeTimestamp = now
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  const logCode = `${logId}-${codeTimestamp}`;

  return { logId, logCode };
};

export const buildSystemLogData = (input: {
  type: LogType;
  category: LogCategory;
  description: string;
  status?: LogStatus;
  actorName?: string;
  actorUserId?: string;
  orderId?: string;
  paymentId?: string;
  productId?: string;
  stockItemId?: string;
}) => {
  const { logId, logCode } = createLogMeta();

  return {
    id: logId,
    logCode,
    type: input.type,
    category: input.category,
    description: input.description,
    status: input.status ?? "SUCCESS",
    actorName: input.actorName ?? "System",
    ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
    ...(input.orderId ? { orderId: input.orderId } : {}),
    ...(input.paymentId ? { paymentId: input.paymentId } : {}),
    ...(input.productId ? { productId: input.productId } : {}),
    ...(input.stockItemId ? { stockItemId: input.stockItemId } : {}),
  };
};

export const createSystemLog = async (
  client: LogClient,
  input: {
    type: LogType;
    category: LogCategory;
    description: string;
    status?: LogStatus;
    actorName?: string;
    actorUserId?: string;
    orderId?: string;
    paymentId?: string;
    productId?: string;
    stockItemId?: string;
  },
) => {
  await client.systemLog.create({
    data: buildSystemLogData(input),
  });
};
