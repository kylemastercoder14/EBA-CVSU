import { NotificationType } from "@/generated/prisma";
import { z } from "zod";

export const notificationsByAccessKeySchema = z.object({
  accessKey: z.string().min(1, "Access key is required"),
});

export const createNotificationSchema = z.object({
  accessKey: z.string().min(1, "Access key is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(NotificationType).optional(),
});

export const markNotificationReadSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
});

export const notificationSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(NotificationType),
  isRead: z.boolean(),
  createdAt: z.string(),
});

export const listNotificationsOutputSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number(),
});

export const createNotificationOutputSchema = notificationSchema;
export const markNotificationReadOutputSchema = notificationSchema;

export const markAllNotificationsReadOutputSchema = z.object({
  success: z.boolean(),
  updatedCount: z.number(),
});
