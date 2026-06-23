import prisma from '../prisma';

type TicketWithConsumerId = {
  consumerUserId: string | null;
  [key: string]: unknown;
};

export async function attachHubUsernames<T extends TicketWithConsumerId>(
  tickets: T[],
): Promise<(T & { hubUsername: string | null })[]> {
  const ids = [
    ...new Set(tickets.map((t) => t.consumerUserId).filter((id): id is string => Boolean(id))),
  ];
  if (ids.length === 0) {
    return tickets.map((t) => ({ ...t, hubUsername: null }));
  }

  const users = await prisma.consumerUser.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true },
  });
  const byId = new Map(users.map((u) => [u.id, u.username]));

  return tickets.map((t) => ({
    ...t,
    hubUsername: t.consumerUserId ? byId.get(t.consumerUserId) ?? null : null,
  }));
}
