export type ChatEscalate = 'emergency' | 'whatsapp' | 'ticket';

const EMERGENCY_PATTERNS: RegExp[] = [
  /\bsmoke\b/i,
  /\bburn(ing|t|s)?\b/i,
  /\bfire\b/i,
  /\bspark(s|ing)?\b/i,
  /\belectrocut/i,
  /\bshock(ed|ing)?\b/i,
  /\bexposed wir/i,
  /\blive wir/i,
  /\bgas leak\b/i,
  /\bburning smell\b/i,
];

const HUMAN_PATTERNS: RegExp[] = [
  /\btalk to (a |someone|an? )?(human|person|agent|someone)\b/i,
  /\b(whatsapp|wa)\b/i,
  /\breal person\b/i,
  /\bcustomer care\b/i,
  /\bescalate\b/i,
];

export function detectChatEscalate(message: string): ChatEscalate | null {
  const text = message.trim();
  if (!text) return null;
  if (EMERGENCY_PATTERNS.some((re) => re.test(text))) return 'emergency';
  if (HUMAN_PATTERNS.some((re) => re.test(text))) return 'whatsapp';
  return null;
}

export const EMERGENCY_CHAT_REPLY =
  'This sounds like a safety issue. Stop using the system if you smell smoke or see sparks or exposed wiring, and call Rayenna 24/7 Emergency Support now. Do not wait for chat.';
