import { LogCategory, LogStatus, LogType } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { base } from "@/middlewares/base";
import { z } from "zod";

export const listLogs = base
  .route({
    method: "GET",
    path: "/logs",
    summary: "list all logs",
    tags: ["logs"],
  })
  .input(z.void())
  .output(
    z.object({
      logs: z.array(
        z.object({
          id: z.string(),
          logCode: z.string(),
          type: z.enum(LogType),
          category: z.enum(LogCategory),
          description: z.string(),
          actorName: z.string(),
          status: z.enum(LogStatus),
          createdAt: z.string(),
        }),
      ),
    }),
  )
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
