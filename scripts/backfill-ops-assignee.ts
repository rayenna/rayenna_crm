/**
 * One-shot: when exactly one active Operations user exists, assign them to all
 * Confirmed+ projects that have no assignedOpsId.
 *
 * Usage: npx ts-node scripts/backfill-ops-assignee.ts
 */
import 'dotenv/config';
import { backfillSoleOpsAssignee } from '../src/utils/opsAssignee';

async function main() {
  const result = await backfillSoleOpsAssignee();
  if (!result.opsUserId) {
    console.log('Skip: need exactly one active Operations user to backfill.');
    return;
  }
  console.log(
    `Backfill complete: assigned Ops user ${result.opsUserId} to ${result.updated} Confirmed+ project(s).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
