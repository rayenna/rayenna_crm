import dotenv from 'dotenv';
import prisma from '../src/prisma';
import { setProjectDeyeStation } from '../src/services/deyeEnergyIngest';

dotenv.config();

/** Hub username → Deye Cloud station id (India). Prefer username over sheet CRM numbers. */
const DEYE_MAP: Array<{ username: string; stationId: string }> = [
  { username: 'sessy.antony', stationId: '70681' },
  { username: 'rajesh.kg', stationId: '45425' },
  { username: 'santhosh.b', stationId: '39593' },
  { username: 'mohamed.kunju', stationId: '35809' },
  { username: 'manoj.augusthy', stationId: '32250' },
  { username: 'snoby.babu', stationId: '31558' },
  { username: 'johnson.kl', stationId: '27582' },
  { username: 'smitha.vineesh', stationId: '24693' },
  { username: 'beena.tp', stationId: '24677' },
  { username: 'sathya.dineshan', stationId: '23547' },
  { username: 'vinish.k', stationId: '20951' },
  { username: 'padmaja', stationId: '20731' },
];

async function main(): Promise<void> {
  let ok = 0;
  const errors: string[] = [];
  for (const row of DEYE_MAP) {
    const user = await prisma.consumerUser.findUnique({
      where: { username: row.username },
      select: {
        username: true,
        project: {
          select: {
            id: true,
            slNo: true,
            solisStationId: true,
            deyeStationId: true,
          },
        },
      },
    });
    if (!user) {
      errors.push(`${row.username} has no Solar Hub account`);
      continue;
    }
    if (user.project.solisStationId) {
      errors.push(`#${user.project.slNo} ${row.username} already linked to Solis — skipped`);
      continue;
    }
    const stray = await prisma.project.findFirst({
      where: { deyeStationId: row.stationId, NOT: { id: user.project.id } },
      select: { id: true, slNo: true, customer: { select: { customerName: true } } },
    });
    if (stray) {
      await prisma.project.update({ where: { id: stray.id }, data: { deyeStationId: null } });
      console.warn(`Moved Deye ${row.stationId} off #${stray.slNo} ${stray.customer.customerName}`);
    }
    try {
      await setProjectDeyeStation(user.project.id, row.stationId);
      ok += 1;
      console.log(`#${user.project.slNo} ${user.username} → Deye ${row.stationId}`);
    } catch (err) {
      errors.push(`#${user.project.slNo} ${row.username}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`Mapped ${ok}/${DEYE_MAP.length} Deye plants`);
  if (errors.length) {
    for (const e of errors) console.error(e);
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
