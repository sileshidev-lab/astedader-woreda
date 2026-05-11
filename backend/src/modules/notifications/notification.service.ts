import { prisma } from "../../prisma/client";

type NotificationInput = {
  title: string;
  message?: string | null;
  type: string;
  link?: string | null;
  recipientRole?: string | null;
  recipientUserId?: string | null;
  recipientHibretId?: string | null;
  createdByUserId?: string | null;
};

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({
    data: {
      title: input.title,
      message: input.message ?? null,
      type: input.type,
      link: input.link ?? null,
      recipientRole: input.recipientRole ?? null,
      recipientUserId: input.recipientUserId ?? null,
      recipientHibretId: input.recipientHibretId ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
}

export async function notifyRole(
  role: string,
  title: string,
  message: string,
  type: string,
  link?: string | null,
  createdByUserId?: string | null
) {
  return createNotification({
    title,
    message,
    type,
    link,
    recipientRole: role,
    createdByUserId,
  });
}

export async function notifyHibret(
  hibretId: string,
  title: string,
  message: string,
  type: string,
  link?: string | null,
  createdByUserId?: string | null
) {
  return createNotification({
    title,
    message,
    type,
    link,
    recipientHibretId: hibretId,
    createdByUserId,
  });
}

export async function notifyWoredaAdmins(
  title: string,
  message: string,
  type: string,
  link?: string | null,
  createdByUserId?: string | null
) {
  return notifyRole("WOREDA_ADMIN", title, message, type, link, createdByUserId);
}
