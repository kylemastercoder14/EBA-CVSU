import {
  type LogCategory,
  type LogStatus,
  type LogType,
} from "@/generated/prisma";

type LogClient = {
  systemLog: {
    findFirst: (args: {
      where: { id: { startsWith: string } };
      orderBy: { id: "desc" };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
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

const getNextLogMeta = async (client: LogClient) => {
  const lastLog = await client.systemLog.findFirst({
    where: {
      id: {
        startsWith: "LOG",
      },
    },
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });

  let nextLogNumber = 1;
  if (lastLog?.id) {
    const currentNumber = Number.parseInt(lastLog.id.replace("LOG", ""), 10);
    if (!Number.isNaN(currentNumber)) {
      nextLogNumber = currentNumber + 1;
    }
  }

  const logId = `LOG${nextLogNumber.toString().padStart(3, "0")}`;
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  const logCode = `${logId}-${timestamp}`;

  return { logId, logCode };
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
  const { logId, logCode } = await getNextLogMeta(client);

  await client.systemLog.create({
    data: {
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
    },
  });
};
