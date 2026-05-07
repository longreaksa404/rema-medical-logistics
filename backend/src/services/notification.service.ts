import { prisma } from '../lib/prisma';

// ─── GET NOTIFICATIONS FOR CURRENT USER ───────────────────────────────────────

export async function getUserNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── MARK NOTIFICATION AS READ ────────────────────────────────────────────────

export async function markRead(id: string, userId: string) {
  // Verify the notification belongs to this user
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new Error('Notification not found');
  if (notification.userId !== userId) {
    throw new Error('Cannot mark another user\'s notification as read');
  }

  return prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

// ─── CREATE NOTIFICATION (internal — called by other services) ────────────────
// Used when scarcity mode triggers, incidents are escalated, phases advance, etc.

export async function createNotification(data: {
  userId: string;
  type: string;
  message: string;
}) {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      message: data.message,
      read: false,
    },
  });
}

// ─── MARK ALL AS READ FOR USER ────────────────────────────────────────────────

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return { updated: result.count };
}