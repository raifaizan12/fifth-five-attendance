import webpush from "web-push";
import { prisma } from "@/lib/prisma";

function configured() {
  return !!(process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}
if (configured()) webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

export async function notifyUsers(userIds: string[], payload: { title: string; message: string; kind?: string; href?: string }) {
  if (!userIds.length) return;
  await prisma.notification.createMany({ data: userIds.map(userId => ({ userId, title: payload.title, message: payload.message, kind: payload.kind || "GENERAL", href: payload.href })) });
  if (!configured()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  await Promise.allSettled(subs.map(async sub => {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload)); }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {}); }
  }));
}
