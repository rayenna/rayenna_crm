import dotenv from 'dotenv';
import {
  getSunwaysCloudConfig,
  listSunwaysStations,
  sunwaysPublicStatus,
} from '../src/services/sunwaysCloudClient';

dotenv.config();

async function main(): Promise<void> {
  const status = sunwaysPublicStatus();
  console.log('Sunways status:', status);
  if (!getSunwaysCloudConfig()) {
    console.error(
      'Missing SUNWAYS_EMAIL / SUNWAYS_PASSWORD in .env (optional SUNWAYS_DISTRIBUTOR_CODES=DB_0147_0004_003)',
    );
    process.exitCode = 1;
    return;
  }
  const stations = await listSunwaysStations();
  console.log(`Stations: ${stations.length}`);
  for (const s of stations) {
    console.log(`- ${s.name} · id=${s.id}${s.capacityKw != null ? ` · ${s.capacityKw} kW` : ''}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
