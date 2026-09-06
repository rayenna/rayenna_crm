import prisma from '../prisma';
import { sendWebPushForKind } from './consumerPushService';
import {
  isWhatsAppAutoNotifyEnabled,
  sendWhatsAppAlert,
} from './consumerWhatsAppService';

export async function notifyConsumerOnce(input: {
  consumerUserId: string;
  kind: string;
  refKey: string;
  title: string;
  body: string;
}): Promise<boolean> {
  const existing = await prisma.consumerNotification.findFirst({
    where: {
      consumerUserId: input.consumerUserId,
      kind: input.kind,
      refKey: input.refKey,
    },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.consumerNotification.create({
    data: {
      consumerUserId: input.consumerUserId,
      kind: input.kind,
      refKey: input.refKey,
      title: input.title.slice(0, 500),
      body: input.body.slice(0, 4000),
    },
  });

  void fanoutDeviceAlerts(input).catch((err) => {
    console.error('Hub device alert fanout failed', err);
  });

  return true;
}

async function fanoutDeviceAlerts(input: {
  consumerUserId: string;
  kind: string;
  title: string;
  body: string;
}): Promise<void> {
  await sendWebPushForKind(input.consumerUserId, {
    title: input.title,
    body: input.body,
    kind: input.kind,
  });

  if (!isWhatsAppAutoNotifyEnabled()) return;

  const user = await prisma.consumerUser.findUnique({
    where: { id: input.consumerUserId },
    select: { phone: true },
  });
  await sendWhatsAppAlert({
    phone: user?.phone,
    title: input.title,
    body: input.body,
  });
}

export async function resolveHubUserIdForProject(projectId: string): Promise<string | null> {
  const user = await prisma.consumerUser.findUnique({
    where: { projectId },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function notifyTicketReceived(input: {
  consumerUserId: string;
  ticketNumber: string;
  title: string;
}): Promise<void> {
  await notifyConsumerOnce({
    consumerUserId: input.consumerUserId,
    kind: 'ticket_received',
    refKey: input.ticketNumber,
    title: `We received your query ${input.ticketNumber}`,
    body: `“${input.title}” is with the Rayenna team. You can follow it on Support.`,
  });
}

export async function notifyTicketInProgress(input: {
  consumerUserId: string;
  ticketNumber: string;
  title: string;
}): Promise<void> {
  await notifyConsumerOnce({
    consumerUserId: input.consumerUserId,
    kind: 'ticket_in_progress',
    refKey: input.ticketNumber,
    title: `We’re working on ${input.ticketNumber}`,
    body: `Your query “${input.title}” is in progress. Open Support for status.`,
  });
}

export async function notifyTicketClosed(input: {
  consumerUserId: string;
  ticketNumber: string;
  title: string;
}): Promise<void> {
  await notifyConsumerOnce({
    consumerUserId: input.consumerUserId,
    kind: 'ticket_closed',
    refKey: input.ticketNumber,
    title: `${input.ticketNumber} was closed`,
    body: `“${input.title}” is marked resolved. If you still need help, send a new query on Support.`,
  });
}

export async function notifyServiceBooked(input: {
  consumerUserId: string;
  requestId: string;
  title: string;
  isIssue: boolean;
}): Promise<void> {
  await notifyConsumerOnce({
    consumerUserId: input.consumerUserId,
    kind: input.isIssue ? 'issue_reported' : 'service_booked',
    refKey: input.requestId,
    title: input.isIssue ? 'Issue reported' : 'Service request submitted',
    body: input.isIssue
      ? `“${input.title}” is with our team. We’ll follow up.`
      : `“${input.title}” is booked. We’ll confirm a visit from Maintain.`,
  });
}

export async function notifyServiceStatus(input: {
  consumerUserId: string;
  requestId: string;
  title: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}): Promise<void> {
  const copy = {
    IN_PROGRESS: {
      kind: 'service_in_progress',
      title: 'Service scheduled',
      body: `“${input.title}” is in progress. Check Maintain for details.`,
    },
    COMPLETED: {
      kind: 'service_completed',
      title: 'Service completed',
      body: `“${input.title}” is marked complete.`,
    },
    CANCELLED: {
      kind: 'service_cancelled',
      title: 'Service request cancelled',
      body: `“${input.title}” was cancelled. You can request again from Maintain.`,
    },
  }[input.status];

  await notifyConsumerOnce({
    consumerUserId: input.consumerUserId,
    kind: copy.kind,
    refKey: `${input.requestId}:${input.status}`,
    title: copy.title,
    body: copy.body,
  });
}

export async function notifyCleaningDue(input: {
  consumerUserId: string;
  dueDate: string;
  overdue: boolean;
}): Promise<void> {
  await notifyConsumerOnce({
    consumerUserId: input.consumerUserId,
    kind: 'cleaning_due',
    refKey: input.dueDate,
    title: input.overdue ? 'Panel cleaning is overdue' : 'Panel cleaning is due',
    body: input.overdue
      ? `Cleaning was due ${input.dueDate}. Schedule service from Maintain.`
      : `Next included cleaning is due ${input.dueDate}. Schedule it from Maintain if you want Rayenna to visit.`,
  });
}
