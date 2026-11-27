/**
 * Mine Zenith Ask clarify misses → exact chip candidates.
 *
 * Usage (API must be running, Admin/Management JWT):
 *   node scripts/mine-zenith-ask-clarify-chips.mjs [days=14]
 *
 * Or paste GET /api/dashboard/zenith-ask-stats?days=14 JSON and print topClarifyQuestions.
 *
 * Wire winners into CHIP_INTENT_BY_NORM in src/services/zenithNl/chipIntents.ts
 * and EXAMPLE_QUESTIONS_BY_ROLE when count ≥ 3.
 */
const days = Number(process.argv[2] || 14);
const base = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:3000';
const token = process.env.CRM_TOKEN || process.env.AUTH_TOKEN || '';

async function main() {
  if (!token) {
    console.error('Set CRM_TOKEN (Bearer JWT for ADMIN/MANAGEMENT) to mine live clarify questions.');
    console.error('Fallback: open /api/dashboard/zenith-ask-stats?days=' + days + ' and copy topClarifyQuestions.');
    process.exit(1);
  }
  const url = `${base.replace(/\/$/, '')}/api/dashboard/zenith-ask-stats?days=${days}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.error('Stats request failed', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  const rows = data.topClarifyQuestions || [];
  console.log(`Clarify rate: ${data.clarifyRate ?? '—'}% · days=${data.days}`);
  console.log('Top clarify questions (add exact chips when count ≥ 3):\n');
  for (const row of rows) {
    console.log(`  ${String(row.count).padStart(3)}  ${row.question}`);
  }
  if (rows.length === 0) {
    console.log('  (none yet — clarify events now store `question` in summary)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
