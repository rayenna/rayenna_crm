import prisma from '../prisma';

/**
 * CRM support tickets require a staff User as createdBy.
 * Consumer-app tickets are attributed to the first ADMIN account (system actor).
 */
export async function resolveConsumerTicketActorUserId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (admin) return admin.id;

  const anyUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!anyUser) {
    throw new Error('No staff user available to attribute consumer support tickets');
  }
  return anyUser.id;
}

export async function generateSupportTicketNumber(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const ticketNumber = `RE${randomNum}`;
    const existing = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
    if (!existing) return ticketNumber;
    attempts++;
  }
  return `RE${Date.now().toString().slice(-8)}`;
}
