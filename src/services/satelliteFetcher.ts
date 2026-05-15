import axios from 'axios';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'generated_layouts');

export async function fetchSatelliteImage(
  projectId: string,
  latitude: number,
  longitude: number,
): Promise<string> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const url =
    'https://maps.googleapis.com/maps/api/staticmap' +
    `?center=${latitude},${longitude}` +
    // zoom=19 gives a 2048×2048 px image at ~0.149 m/px (equator).
    // zoom=20 sounds higher-res but causes visible stitching/seam artifacts
    // because Google tiles that zone from lower-zoom imagery — zoom=19 has
    // consistent native coverage almost everywhere and looks far cleaner.
    '&zoom=19&size=1024x1024&scale=2&maptype=satellite' +
    `&key=${apiKey}`;

  const res = await axios.get(url, { responseType: 'arraybuffer' });
  const filePath = path.join(OUTPUT_DIR, `${projectId}_satellite.png`);
  fs.writeFileSync(filePath, res.data);
  return filePath;
}

