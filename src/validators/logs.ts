import { LogCategory, LogStatus, LogType } from "@/generated/prisma";
import { z } from "zod";

export const listLogsInputSchema = z.void();

export const logSchema = z.object({
  id: z.string(),
  logCode: z.string(),
  type: z.enum(LogType),
  category: z.enum(LogCategory),
  description: z.string(),
  actorName: z.string(),
  status: z.enum(LogStatus),
  createdAt: z.string(),
});

export const listLogsOutputSchema = z.object({
  logs: z.array(logSchema),
});
