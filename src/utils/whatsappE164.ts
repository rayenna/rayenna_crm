/** Digits-only E.164 for India WhatsApp (wa.me / Cloud API). */
export function toWhatsAppE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function whatsAppMeUrl(e164: string, text: string): string {
  return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}
