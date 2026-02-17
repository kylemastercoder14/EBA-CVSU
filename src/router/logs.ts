import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import { listLogsInputSchema, listLogsOutputSchema } from "@/validators/logs";

export const listLogs = base
  .route({
    method: "GET",
    path: "/logs",
    summary: "list all logs",
    tags: ["logs"],
  })
  .input(listLogsInputSchema)
  .output(listLogsOutputSchema)
  .handler(async () => {
    const logs = await prisma.systemLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      logs: logs.map((log) => ({
        id: log.id,
        logCode: log.logCode,
        type: log.type,
        category: log.category,
        description: log.description,
        actorName: log.actorName ?? "System",
        status: log.status,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  });
