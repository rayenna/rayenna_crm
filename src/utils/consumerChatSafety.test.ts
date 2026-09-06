import { describe, expect, it } from 'vitest';
import { detectChatEscalate } from './consumerChatSafety';

describe('detectChatEscalate', () => {
  it('flags smoke and wiring as emergency', () => {
    expect(detectChatEscalate('I smell smoke near the inverter')).toBe('emergency');
    expect(detectChatEscalate('There is exposed wiring on the roof')).toBe('emergency');
  });

  it('flags talk to someone as WhatsApp', () => {
    expect(detectChatEscalate('I want to talk to someone')).toBe('whatsapp');
  });

  it('leaves normal questions unescalated', () => {
    expect(detectChatEscalate('How does net metering work?')).toBeNull();
  });
});
