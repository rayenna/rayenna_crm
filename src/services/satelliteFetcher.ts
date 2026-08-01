import axios from 'axios';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'generated_layouts');

/** Real static-map tiles are hundreds of KB; Google's grey "no imagery" placeholder is ~7–12 KB. */
const PLACEHOLDER_SATELLITE_MAX_BYTES = 30_000;

function noImageryError(latitude: number, longitude: number): string {
  return (
    `Google Maps has no satellite imagery for ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. ` +
    'Verify Map GPS in Customer Master or paste a corrected Google Maps URL on the layout page, then Regenerate.'
  );
}

function mapsApiRejectionMessage(status: number, bodyText: string): string {
  const lower = bodyText.toLowerCase();
  if (lower.includes('api key is invalid') || lower.includes('invalid api key')) {
    return (
      'Google Maps rejected GOOGLE_MAPS_API_KEY (invalid key). ' +
      'Update the key on the CRM API (local .env and/or Render), enable Maps Static API, then retry.'
    );
  }
  if (lower.includes('referer') || lower.includes('referrer') || lower.includes('ip address')) {
    return (
      'Google Maps rejected this request due to API key restrictions. ' +
      'Allow server-side Static Maps calls (no HTTP referrer restriction; use IP or unrestricted for the CRM API host).'
    );
  }
  if (
    lower.includes('not authorized') ||
    lower.includes('this api project is not authorized') ||
    lower.includes('maps static api')
  ) {
    return (
      'Google Maps Static API is not enabled (or not authorized) for this API key. ' +
      'Enable Maps Static API in Google Cloud Console, then retry.'
    );
  }
  if (status === 403) {
    return (
      'Google Maps Static API returned 403 (forbidden). ' +
      'Check GOOGLE_MAPS_API_KEY, Maps Static API enablement, billing, and key restrictions.'
    );
  }
  if (status === 429) {
    return 'Google Maps Static API rate limit exceeded. Wait a moment and try again.';
  }
  const snippet = bodyText.replace(/\s+/g, ' ').trim().slice(0, 180);
  return snippet
    ? `Google Maps Static API failed (HTTP ${status}): ${snippet}`
    : `Google Maps Static API failed (HTTP ${status}).`;
}

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

  let res;
  try {
    res = await axios.get(url, {
      responseType: 'arraybuffer',
      // Google returns 403 with a plain-text body for key/restriction failures —
      // handle those here instead of surfacing Axios's opaque status-code message.
      validateStatus: () => true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'network error';
    throw new Error(`Could not reach Google Maps Static API (${msg}).`);
  }

  const buf = Buffer.from(res.data);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(mapsApiRejectionMessage(res.status, buf.toString('utf8')));
  }

  if (buf.length < PLACEHOLDER_SATELLITE_MAX_BYTES) {
    throw new Error(noImageryError(latitude, longitude));
  }

  const filePath = path.join(OUTPUT_DIR, `${projectId}_satellite.png`);
  fs.writeFileSync(filePath, buf);
  return filePath;
}

