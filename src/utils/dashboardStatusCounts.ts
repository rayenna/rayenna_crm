import { ProjectStatus } from '@prisma/client';

export type StatusCountRow = {
  projectStatus: ProjectStatus;
  _count: { id: number };
};

/** Sum `_count.id` for matching `projectStatus` values from a Prisma groupBy. */
export function countFromStatusGroupBy(
  rows: StatusCountRow[] | undefined,
  statuses: ProjectStatus | ProjectStatus[],
): number {
  const wanted = Array.isArray(statuses) ? statuses : [statuses];
  const set = new Set(wanted);
  return (rows ?? []).reduce(
    (sum, row) => (set.has(row.projectStatus) ? sum + (row._count?.id || 0) : sum),
    0,
  );
}
