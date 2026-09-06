import webpush from 'web-push';
import prisma from '../prisma';
import { hubPathForKind } from '../utils/hubAlertTemplates';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function vapidConfigured(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || 'mailto:ops@rayenna.in').trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey(): string | null {
  return vapidConfigured()?.publicKey ?? null;
}

function configureWebPush(): boolean {
  const cfg = vapidConfigured();
  if (!cfg) return false;
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  return true;
}

export async function savePushSubscription(
  consumerUserId: string,
  input: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
): Promise<void> {
  const endpoint = input.endpoint.trim();
  if (!endpoint || endpoint.length > 2048) throw new Error('Invalid push endpoint');
  await prisma.consumerPushSubscription.upsert({
    where: { endpoint },
    create: {
      consumerUserId,
      endpoint,
      p256dh: input.p256dh.slice(0, 255),
      auth: input.auth.slice(0, 255),
      userAgent: input.userAgent?.slice(0, 512) || null,
    },
    update: {
      consumerUserId,
      p256dh: input.p256dh.slice(0, 255),
      auth: input.auth.slice(0, 255),
      userAgent: input.userAgent?.slice(0, 512) || null,
    },
  });
}

export async function deletePushSubscription(
  consumerUserId: string,
  endpoint: string,
): Promise<void> {
  await prisma.consumerPushSubscription.deleteMany({
    where: { consumerUserId, endpoint: endpoint.trim() },
  });
}

export async function sendWebPushToUser(
  consumerUserId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!configureWebPush()) return { sent: 0, failed: 0 };

  const rows = await prisma.consumerPushSubscription.findMany({
    where: { consumerUserId },
  });
  if (rows.length === 0) return { sent: 0, failed: 0 };

  const body = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 500),
    url: payload.url || '/',
  });

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: 60 * 60 * 24 },
      );
      sent += 1;
    } catch (err: unknown) {
      failed += 1;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.consumerPushSubscription.delete({ where: { id: row.id } }).catch(() => undefined);
      } else {
        console.error('Hub web push failed', status || err);
      }
    }
  }
  return { sent, failed };
}

export async function sendWebPushForKind(
  consumerUserId: string,
  input: { title: string; body: string; kind: string },
): Promise<{ sent: number; failed: number }> {
  return sendWebPushToUser(consumerUserId, {
    title: input.title,
    body: input.body,
    url: hubPathForKind(input.kind),
  });
}
