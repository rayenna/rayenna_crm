import dotenv from 'dotenv';
import prisma from '../src/prisma';
import { smokeMappedSolisHubUsers } from '../src/services/solisEnergyIngest';

dotenv.config();

async function main(): Promise<void> {
  const report = await smokeMappedSolisHubUsers();
  for (const p of report.plantsOut) {
    const range =
      p.minKwh != null && p.maxKwh != null ? `${p.minKwh}–${p.maxKwh} kWh` : 'no live kWh';
    console.log(
      `#${p.slNo} ${p.customerName} · ${p.liveMonths} live months · repaired ${p.repairedMonths} · ${range}`,
    );
  }
  console.log(
    `Solis Hub smoke: ${report.plants} plants, ${report.repairedMonths} months rewritten, ${report.errors.length} errors`,
  );
  if (report.errors.length > 0) {
    for (const err of report.errors) console.error(err);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
