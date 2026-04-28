import { randomUUID } from "node:crypto";

export const createNotificationId = () => `NOTIF-${randomUUID()}`;
