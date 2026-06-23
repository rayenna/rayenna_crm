import { SupportTicketSource, SupportTicketStatus } from '@prisma/client';
import prisma from '../prisma';
import {
  CONSUMER_FAQ_ITEMS,
  CONSUMER_LEARN_TIPS,
  CONSUMER_SUPPORT_EMAIL,
  CONSUMER_SUPPORT_PHONE,
} from '../constants/consumerSupportContent';
import { tierFromPoints } from '../utils/consumerAuth';
import {
  generateSupportTicketNumber,
  resolveConsumerTicketActorUserId,
} from '../utils/supportTicketHelpers';

const SUPPORT_TICKET_POINTS = 25;

export type ConsumerSupportTicketDto = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  status: SupportTicketStatus;
  createdAt: string;
};

export type ConsumerSupportMetaDto = {
  emergencyPhone: string;
  supportEmail: string;
  referralCode: string;
  referralRewardLabel: string;
};

export async function getConsumerSupportMeta(consumerUserId: string): Promise<ConsumerSupportMetaDto> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    select: { referralCode: true },
  });
  if (!consumer) throw new Error('Consumer not found');

  return {
    emergencyPhone: CONSUMER_SUPPORT_PHONE,
    supportEmail: CONSUMER_SUPPORT_EMAIL,
    referralCode: consumer.referralCode,
    referralRewardLabel: 'Get ₹1,000 off next service',
  };
}

export async function listConsumerSupportTickets(
  consumerUserId: string,
): Promise<ConsumerSupportTicketDto[]> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    select: { projectId: true },
  });
  if (!consumer) throw new Error('Consumer not found');

  const tickets = await prisma.supportTicket.findMany({
    where: {
      projectId: consumer.projectId,
      source: SupportTicketSource.CONSUMER_APP,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return tickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    title: t.title,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function createConsumerSupportTicket(
  consumerUserId: string,
  input: { title: string; description?: string },
): Promise<ConsumerSupportTicketDto> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
  });
  if (!consumer) throw new Error('Consumer not found');

  const createdById = await resolveConsumerTicketActorUserId();
  const ticketNumber = await generateSupportTicketNumber();

  const [ticket] = await prisma.$transaction([
    prisma.supportTicket.create({
      data: {
        ticketNumber,
        projectId: consumer.projectId,
        title: input.title.slice(0, 500),
        description: input.description?.slice(0, 5000) || null,
        status: SupportTicketStatus.OPEN,
        source: SupportTicketSource.CONSUMER_APP,
        consumerUserId,
        createdById,
      },
    }),
    prisma.consumerUser.update({
      where: { id: consumerUserId },
      data: {
        points: { increment: SUPPORT_TICKET_POINTS },
      },
    }),
  ]);

  const updatedConsumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
  });
  if (updatedConsumer) {
    await prisma.consumerUser.update({
      where: { id: consumerUserId },
      data: { memberTier: tierFromPoints(updatedConsumer.points) },
    });
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
  };
}

export function getConsumerFaqPayload() {
  return {
    faqs: CONSUMER_FAQ_ITEMS,
    tips: CONSUMER_LEARN_TIPS,
  };
}
