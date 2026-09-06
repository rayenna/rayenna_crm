import { SupportTicketSource, SupportTicketStatus } from '@prisma/client';
import prisma from '../prisma';
import { getConsumerHelpFeaturedFaqs } from '../services/consumerHelpService';
import {
  CONSUMER_LEARN_TIPS,
  CONSUMER_SUPPORT_EMAIL,
  CONSUMER_SUPPORT_PHONE,
} from '../constants/consumerSupportContent';
import { tierFromPoints } from '../utils/consumerAuth';
import {
  generateSupportTicketNumber,
  resolveConsumerTicketActorUserId,
} from '../utils/supportTicketHelpers';
import { isConsumerSupportBotEnabled } from './consumerChatService';
import { countReferralSuccesses } from './consumerReferralService';
import { notifyTicketReceived } from './consumerNotificationService';

const SUPPORT_TICKET_POINTS = 25;

export type ConsumerSupportTicketDto = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string | null;
  status: SupportTicketStatus;
  source: SupportTicketSource;
  createdAt: string;
  updatedAt: string;
};

export type ConsumerSupportMetaDto = {
  emergencyPhone: string;
  supportEmail: string;
  referralCode: string;
  referralRewardLabel: string;
  referralSuccessCount: number;
  referralChampionAt: number;
  chatBotEnabled: boolean;
};

export async function getConsumerSupportMeta(consumerUserId: string): Promise<ConsumerSupportMetaDto> {
  const consumer = await prisma.consumerUser.findUnique({
    where: { id: consumerUserId },
    select: { referralCode: true },
  });
  if (!consumer) throw new Error('Consumer not found');

  const referralSuccessCount = await countReferralSuccesses(consumerUserId);

  return {
    emergencyPhone: CONSUMER_SUPPORT_PHONE,
    supportEmail: CONSUMER_SUPPORT_EMAIL,
    referralCode: consumer.referralCode,
    referralRewardLabel:
      'Share this code with Rayenna when a friend books solar. Each attributed referral is +50 Hub points; 3 unlock Referral Champion.',
    referralSuccessCount,
    referralChampionAt: 3,
    chatBotEnabled: isConsumerSupportBotEnabled(),
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
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  return tickets.map((t) => ({
    id: t.id,
    ticketNumber: t.ticketNumber,
    title: t.title,
    description: t.description,
    status: t.status,
    source: t.source,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
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

  try {
    await notifyTicketReceived({
      consumerUserId,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
    });
  } catch (err) {
    console.error('Hub ticket notification failed', err);
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    source: ticket.source,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function getConsumerFaqPayload() {
  const featuredFaqs = await getConsumerHelpFeaturedFaqs();
  return {
    featuredFaqs: featuredFaqs.map((faq) => ({
      id: faq.id,
      question: faq.question,
      category: faq.category,
      answer: faq.answer,
    })),
    tips: CONSUMER_LEARN_TIPS,
  };
}
