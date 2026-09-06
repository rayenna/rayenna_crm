import prisma from '../prisma';
import {
  getHubAlertTemplate,
  HUB_ALERT_TEMPLATES,
  hubPathForKind,
  type HubAlertTemplateId,
} from '../utils/hubAlertTemplates';
import { sendWebPushToUser, getVapidPublicKey } from './consumerPushService';
import {
  isWhatsAppCloudConfigured,
  sendWhatsAppAlert,
} from './consumerWhatsAppService';

export type HubMessageChannelResult = {
  channel: 'hub' | 'push' | 'whatsapp';
  status: string;
  detail: string | null;
  waMeUrl?: string | null;
  sent?: number;
  failed?: number;
};

export function listHubMessageTemplates() {
  return {
    templates: HUB_ALERT_TEMPLATES,
    pushConfigured: Boolean(getVapidPublicKey()),
    whatsappCloudConfigured: isWhatsAppCloudConfigured(),
    whatsappNote: isWhatsAppCloudConfigured()
      ? 'Cloud API will send if WHATSAPP_TEMPLATE_HUB_ALERT is an approved template with two body variables (title, body).'
      : 'WhatsApp is a staff draft (wa.me). Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TEMPLATE_HUB_ALERT on the API to send from Rayenna.',
  };
}

export async function sendHubUserMessage(input: {
  consumerUserId: string;
  templateId: string;
  title?: string;
  body?: string;
  channels: { hub?: boolean; push?: boolean; whatsapp?: boolean };
  createdById?: string;
}): Promise<{ results: HubMessageChannelResult[] }> {
  const template = getHubAlertTemplate(input.templateId);
  if (!template) throw new Error('Unknown template');

  const title = (input.title?.trim() || template.defaultTitle).slice(0, 500);
  const body = (input.body?.trim() || template.defaultBody).slice(0, 4000);
  if (!title || !body) throw new Error('Title and body are required');

  const user = await prisma.consumerUser.findUnique({
    where: { id: input.consumerUserId },
    select: { id: true, phone: true },
  });
  if (!user) throw new Error('Solar Hub user not found');

  const wantHub = input.channels.hub !== false;
  const wantPush = Boolean(input.channels.push);
  const wantWhatsApp = Boolean(input.channels.whatsapp);
  if (!wantHub && !wantPush && !wantWhatsApp) {
    throw new Error('Select at least one channel');
  }

  const results: HubMessageChannelResult[] = [];
  const kind = template.kind;
  const templateId = template.id as HubAlertTemplateId;

  if (wantHub) {
    await prisma.consumerNotification.create({
      data: {
        consumerUserId: user.id,
        kind,
        refKey: `crm:${Date.now()}`,
        title,
        body,
      },
    });
    await logOutbound({
      consumerUserId: user.id,
      channel: 'hub',
      templateId,
      title,
      body,
      status: 'sent',
      detail: null,
      createdById: input.createdById,
    });
    results.push({ channel: 'hub', status: 'sent', detail: 'In-app notification created' });
  }

  if (wantPush) {
    const push = await sendWebPushToUser(user.id, {
      title,
      body,
      url: hubPathForKind(kind),
    });
    const status = push.sent > 0 ? 'sent' : getVapidPublicKey() ? 'skipped' : 'skipped';
    const detail =
      push.sent > 0
        ? `Delivered to ${push.sent} device(s)`
        : getVapidPublicKey()
          ? 'No Hub devices subscribed to push'
          : 'VAPID keys are not set on the API';
    await logOutbound({
      consumerUserId: user.id,
      channel: 'push',
      templateId,
      title,
      body,
      status,
      detail,
      createdById: input.createdById,
    });
    results.push({
      channel: 'push',
      status,
      detail,
      sent: push.sent,
      failed: push.failed,
    });
  }

  if (wantWhatsApp) {
    const wa = await sendWhatsAppAlert({ phone: user.phone, title, body });
    await logOutbound({
      consumerUserId: user.id,
      channel: 'whatsapp',
      templateId,
      title,
      body,
      status: wa.status,
      detail: wa.detail,
      createdById: input.createdById,
    });
    results.push({
      channel: 'whatsapp',
      status: wa.status,
      detail: wa.detail,
      waMeUrl: wa.waMeUrl,
    });
  }

  return { results };
}

export async function listRecentOutbound(consumerUserId: string, take = 8) {
  const rows = await prisma.consumerOutboundMessage.findMany({
    where: { consumerUserId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    templateId: r.templateId,
    title: r.title,
    status: r.status,
    detail: r.detail,
    createdAt: r.createdAt.toISOString(),
  }));
}

async function logOutbound(input: {
  consumerUserId: string;
  channel: string;
  templateId: string;
  title: string;
  body: string;
  status: string;
  detail: string | null;
  createdById?: string;
}) {
  await prisma.consumerOutboundMessage.create({
    data: {
      consumerUserId: input.consumerUserId,
      channel: input.channel,
      templateId: input.templateId,
      title: input.title,
      body: input.body,
      status: input.status,
      detail: input.detail,
      createdById: input.createdById ?? null,
    },
  });
}
