/**
 * One-time / on-demand backfill for Solar Hub auto-provisioning.
 *
 *   npm run prisma:backfill:consumer-hub
 */
import { backfillConsumerHubAccounts } from '../src/services/consumerHubProvision';

async function main() {
  const summary = await backfillConsumerHubAccounts();
  console.log('Solar Hub backfill complete:');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
