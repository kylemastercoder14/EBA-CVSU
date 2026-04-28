import { prisma } from "@/lib/prisma";
import { createNotificationId } from "@/lib/notification-id";
import { createSystemLog } from "@/lib/system-log";
import { base } from "@/middlewares/base";
import {
  createNotificationOutputSchema,
  createNotificationSchema,
  listNotificationsOutputSchema,
  markAllNotificationsReadOutputSchema,
  markNotificationReadOutputSchema,
  markNotificationReadSchema,
  notificationsByAccessKeySchema,
} from "@/validators/notifications";

const toNotificationPayload = (notification: {
  id: string;
  staffId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING";
  isRead: boolean;
  createdAt: Date;
}) => ({
  id: notification.id,
  staffId: notification.staffId,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  isRead: notification.isRead,
  createdAt: notification.createdAt.toISOString(),
});

export const listNotifications = base
  .route({
    method: "POST",
    path: "/notifications/list",
    summary: "list notifications by staff access key",
    tags: ["notifications"],
  })
  .input(notificationsByAccessKeySchema)
  .output(listNotificationsOutputSchema)
  .handler(async ({ input, errors }) => {
    const staff = await prisma.staff.findUnique({
      where: {
        accessKey: input.accessKey,
      },
      select: {
        id: true,
      },
    });

    if (!staff) {
      throw errors.NOT_FOUND();
    }

    const notifications = await prisma.notification.findMany({
      where: {
        staffId: staff.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        staffId: staff.id,
        isRead: false,
      },
    });

    return {
      notifications: notifications.map(toNotificationPayload),
      unreadCount,
    };
  });

export const createNotification = base
  .route({
    method: "POST",
    path: "/notifications",
    summary: "create a notification for a staff member",
    tags: ["notifications"],
  })
  .input(createNotificationSchema)
  .output(createNotificationOutputSchema)
  .handler(async ({ input, errors }) => {
    const staff = await prisma.staff.findUnique({
      where: {
        accessKey: input.accessKey,
      },
      select: {
        id: true,
      },
    });

    if (!staff) {
      throw errors.NOT_FOUND();
    }

    const notification = await prisma.notification.create({
      data: {
        id: createNotificationId(),
        staffId: staff.id,
        title: input.title.trim(),
        message: input.message.trim(),
        type: input.type ?? "INFO",
      },
    });

    await createSystemLog(prisma, {
      type: "SYSTEM",
      category: "PAYMENT_PENDING",
      description: `Notification "${notification.title}" created for staff ${staff.id}.`,
      status: "SUCCESS",
      actorName: "System",
    });

    return toNotificationPayload(notification);
  });

export const markNotificationRead = base
  .route({
    method: "PATCH",
    path: "/notifications/{id}/read",
    summary: "mark one notification as read",
    tags: ["notifications"],
  })
  .input(markNotificationReadSchema)
  .output(markNotificationReadOutputSchema)
  .handler(async ({ input, errors }) => {
    const existingNotification = await prisma.notification.findUnique({
      where: {
        id: input.id,
      },
    });

    if (!existingNotification) {
      throw errors.NOT_FOUND();
    }

    const notification = await prisma.notification.update({
      where: {
        id: input.id,
      },
      data: {
        isRead: true,
      },
    });

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `Notification "${notification.id}" marked as read.`,
      status: "SUCCESS",
      actorName: "Staff",
    });

    return toNotificationPayload(notification);
  });

export const markAllNotificationsRead = base
  .route({
    method: "PATCH",
    path: "/notifications/read-all",
    summary: "mark all notifications as read for a staff member",
    tags: ["notifications"],
  })
  .input(notificationsByAccessKeySchema)
  .output(markAllNotificationsReadOutputSchema)
  .handler(async ({ input, errors }) => {
    const staff = await prisma.staff.findUnique({
      where: {
        accessKey: input.accessKey,
      },
      select: {
        id: true,
      },
    });

    if (!staff) {
      throw errors.NOT_FOUND();
    }

    const result = await prisma.notification.updateMany({
      where: {
        staffId: staff.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    await createSystemLog(prisma, {
      type: "ACTIVITY",
      category: "PAYMENT_PENDING",
      description: `${result.count} notification(s) marked as read for staff ${staff.id}.`,
      status: "SUCCESS",
      actorName: "Staff",
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  });
