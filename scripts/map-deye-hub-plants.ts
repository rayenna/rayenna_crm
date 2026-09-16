import dotenv from 'dotenv';
import prisma from '../src/prisma';
import { setProjectDeyeStation } from '../src/services/deyeEnergyIngest';

dotenv.config();

/** CRM slNo → Deye Cloud station id (India). Hub username is for a sanity check only. */
const DEYE_MAP: Array<{ slNo: number; username: string; stationId: string }> = [
  { slNo: 135, username: 'sessy.antony', stationId: '70681' },
  { slNo: 80, username: 'rajesh.kg', stationId: '45425' },
  { slNo: 32, username: 'santhosh.k', stationId: '39593' },
  { slNo: 51, username: 'mohamed.kunju', stationId: '35809' },
  { slNo: 101, username: 'manoj.augusthy', stationId: '32250' },
  { slNo: 82, username: 'snoby.babu', stationId: '31558' },
  { slNo: 98, username: 'johnson.kl', stationId: '27582' },
  { slNo: 84, username: 'smitha.vineesh', stationId: '24693' },
  { slNo: 76, username: 'beena.tp', stationId: '24677' },
  { slNo: 57, username: 'sathya.dineeshan', stationId: '23547' },
  { slNo: 90, username: 'vinish.k', stationId: '20951' },
  { slNo: 93, username: 'padmaja', stationId: '20731' },
];

async function main(): Promise<void> {
  let ok = 0;
  const errors: string[] = [];
  for (const row of DEYE_MAP) {
    const project = await prisma.project.findUnique({
      where: { slNo: row.slNo },
      select: {
        id: true,
        slNo: true,
        solisStationId: true,
        deyeStationId: true,
        consumerUser: { select: { username: true } },
      },
    });
    if (!project) {
      errors.push(`#${row.slNo} not found in CRM`);
      continue;
    }
    const hubUser = project.consumerUser?.username;
    if (hubUser && hubUser !== row.username) {
      console.warn(`#${row.slNo} Hub user is ${hubUser} (list had ${row.username}) — mapping by CRM number`);
    }
    if (project.solisStationId) {
      errors.push(`#${row.slNo} already linked to Solis ${project.solisStationId} — skipped`);
      continue;
    }
    try {
      await setProjectDeyeStation(project.id, row.stationId);
      ok += 1;
      console.log(`#${row.slNo} ${hubUser ?? row.username} → Deye ${row.stationId}`);
    } catch (err) {
      errors.push(`#${row.slNo}: ${err instanceof Error ? err.message : String(err)}`);
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
