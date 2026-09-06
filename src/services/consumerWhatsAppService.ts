import { toWhatsAppE164, whatsAppMeUrl } from '../utils/whatsappE164';

export type WhatsAppSendResult = {
  status: 'sent' | 'draft' | 'skipped' | 'failed';
  e164: string | null;
  waMeUrl: string | null;
  detail: string | null;
};

function cloudConfigured(): { token: string; phoneNumberId: string } | null {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId };
}

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(cloudConfigured());
}

export function isWhatsAppAutoNotifyEnabled(): boolean {
  return process.env.WHATSAPP_AUTO_NOTIFY === '1' && isWhatsAppCloudConfigured();
}

function hubAlertTemplateName(): string | null {
  const name = (process.env.WHATSAPP_TEMPLATE_HUB_ALERT || '').trim();
  return name || null;
}

export function buildWhatsAppDraftText(title: string, body: string): string {
  return `${title}\n\n${body}`.trim();
}

async function sendCloudTemplate(
  e164: string,
  title: string,
  body: string,
): Promise<{ ok: boolean; detail: string }> {
  const cloud = cloudConfigured();
  const templateName = hubAlertTemplateName();
  if (!cloud || !templateName) {
    return { ok: false, detail: 'WhatsApp Cloud template name is not set' };
  }

  const url = `https://graph.facebook.com/v21.0/${cloud.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cloud.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: e164,
      type: 'template',
      template: {
        name: templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: title.slice(0, 1024) },
              { type: 'text', text: body.slice(0, 1024) },
            ],
          },
        ],
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    return { ok: false, detail: raw.slice(0, 1500) };
  }
  return { ok: true, detail: raw.slice(0, 500) };
}

export async function sendWhatsAppAlert(input: {
  phone: string | null | undefined;
  title: string;
  body: string;
}): Promise<WhatsAppSendResult> {
  const e164 = toWhatsAppE164(input.phone);
  const text = buildWhatsAppDraftText(input.title, input.body);
  if (!e164) {
    return { status: 'skipped', e164: null, waMeUrl: null, detail: 'No valid mobile number' };
  }

  const waMeUrl = whatsAppMeUrl(e164, text);
  const templateName = hubAlertTemplateName();

  if (cloudConfigured() && templateName) {
    try {
      const sent = await sendCloudTemplate(e164, input.title, input.body);
      if (sent.ok) {
        return { status: 'sent', e164, waMeUrl, detail: sent.detail };
      }
      return { status: 'failed', e164, waMeUrl, detail: sent.detail };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'WhatsApp send failed';
      return { status: 'failed', e164, waMeUrl, detail: msg };
    }
  }

  return {
    status: 'draft',
    e164,
    waMeUrl,
    detail: 'Open WhatsApp on this device to send. Cloud API is not configured.',
  };
}
