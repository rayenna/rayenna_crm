import prisma from '../../prisma';

export const ZENITH_ASK_HISTORY_MAX = 12;

export type AskHistoryRow = {
  id: string;
  question: string;
  insight: string;
  metric: string;
  at: number;
};

function ser(row: {
  id: string;
  question: string;
  insight: string;
  metric: string;
  askedAt: Date;
}): AskHistoryRow {
  return {
    id: row.id,
    question: row.question,
    insight: row.insight,
    metric: row.metric,
    at: row.askedAt.getTime(),
  };
}

/** Last N successful Ask answers for a user (newest first). */
export async function listUserAskHistory(userId: string): Promise<AskHistoryRow[]> {
  const rows = await prisma.userAskHistory.findMany({
    where: { userId },
    orderBy: { askedAt: 'desc' },
    take: ZENITH_ASK_HISTORY_MAX,
  });
  return rows.map(ser);
}

/**
 * Persist a successful metric ask. Dedupes by question (keeps newest), trims to max.
 */
export async function persistUserAskHistory(input: {
  userId: string;
  question: string;
  insight: string;
  metric: string;
  askedAt?: Date;
}): Promise<AskHistoryRow[]> {
  const question = input.question.trim().slice(0, 500);
  const insight = input.insight.trim().slice(0, 4000);
  const metric = input.metric.trim().slice(0, 80);
  if (!input.userId || !question || !insight || !metric) {
    return listUserAskHistory(input.userId);
  }
  const askedAt = input.askedAt ?? new Date();

  await prisma.$transaction(async (tx) => {
    await tx.userAskHistory.deleteMany({
      where: { userId: input.userId, question },
    });
    await tx.userAskHistory.create({
      data: {
        userId: input.userId,
        question,
        insight,
        metric,
        askedAt,
      },
    });
    const overflow = await tx.userAskHistory.findMany({
      where: { userId: input.userId },
      orderBy: { askedAt: 'desc' },
      skip: ZENITH_ASK_HISTORY_MAX,
      select: { id: true },
    });
    if (overflow.length > 0) {
      await tx.userAskHistory.deleteMany({
        where: { id: { in: overflow.map((r) => r.id) } },
      });
    }
  });

  return listUserAskHistory(input.userId);
}
