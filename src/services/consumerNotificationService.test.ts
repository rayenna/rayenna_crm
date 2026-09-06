import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../prisma', () => ({
  default: {
    consumerNotification: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../services/consumerPushService', () => ({
  sendWebPushForKind: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
}));

vi.mock('../services/consumerWhatsAppService', () => ({
  isWhatsAppAutoNotifyEnabled: vi.fn().mockReturnValue(false),
  sendWhatsAppAlert: vi.fn(),
}));

import prisma from '../prisma';
import { notifyConsumerOnce } from '../services/consumerNotificationService';

const mocked = prisma as unknown as {
  consumerNotification: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

describe('notifyConsumerOnce', () => {
  beforeEach(() => {
    mocked.consumerNotification.findFirst.mockReset();
    mocked.consumerNotification.create.mockReset();
  });

  it('creates when kind+refKey is new', async () => {
    mocked.consumerNotification.findFirst.mockResolvedValue(null);
    mocked.consumerNotification.create.mockResolvedValue({ id: 'n1' });
    const created = await notifyConsumerOnce({
      consumerUserId: 'u1',
      kind: 'cleaning_due',
      refKey: '2026-09-15',
      title: 'Panel cleaning is due',
      body: 'Due 15 Sep',
    });
    expect(created).toBe(true);
    expect(mocked.consumerNotification.create).toHaveBeenCalledTimes(1);
  });

  it('skips duplicate kind+refKey', async () => {
    mocked.consumerNotification.findFirst.mockResolvedValue({ id: 'n1' });
    const created = await notifyConsumerOnce({
      consumerUserId: 'u1',
      kind: 'cleaning_due',
      refKey: '2026-09-15',
      title: 'Panel cleaning is due',
      body: 'Due 15 Sep',
    });
    expect(created).toBe(false);
    expect(mocked.consumerNotification.create).not.toHaveBeenCalled();
  });
});
