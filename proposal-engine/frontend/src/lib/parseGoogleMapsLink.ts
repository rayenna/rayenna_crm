/** Parsed WGS84 point from a Google Maps share URL or "lat,lng" text. */
export type ParsedLatLng = { lat: number; lng: number };

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Extract coordinates from Google Maps URLs and plain "lat,lng" strings.
 * Matches common share formats (@, ?q=, ?ll=, !3d/!4d place data).
 */
export function parseGoogleMapsLatLng(input: string): ParsedLatLng | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Plain "12.97, 77.59" paste
  const plain = trimmed.match(/^([+-]?\d{1,2}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)$/);
  if (plain) {
    const lat = Number(plain[1]);
    const lng = Number(plain[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // ?q=lat,lng or &q=lat,lng
  const qMatch = trimmed.match(/[?&]q=([+-]?\d{1,2}(?:\.\d+)?),([+-]?\d{1,3}(?:\.\d+)?)/);
  if (qMatch) {
    const lat = Number(qMatch[1]);
    const lng = Number(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // @lat,lng,zoom (most share links)
  const atMatch = trimmed.match(/@([+-]?\d{1,2}(?:\.\d+)?),([+-]?\d{1,3}(?:\.\d+)?)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // ?ll=lat,lng
  const llMatch = trimmed.match(/[?&]ll=([+-]?\d{1,2}(?:\.\d+)?),([+-]?\d{1,3}(?:\.\d+)?)/);
  if (llMatch) {
    const lat = Number(llMatch[1]);
    const lng = Number(llMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Place data: !3d12.9716!4d77.5946 (prefer over loose comma match)
  const dMatch = trimmed.match(/!3d([+-]?\d{1,2}(?:\.\d+)?)!4d([+-]?\d{1,3}(?:\.\d+)?)/i);
  if (dMatch) {
    const lat = Number(dMatch[1]);
    const lng = Number(dMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Fallback: first plausible lat,lng pair in the string (avoid matching zoom-only integers)
  const coordPattern = trimmed.match(/([+-]?\d{1,2}\.\d{4,}),\s*([+-]?\d{1,3}\.\d{4,})/);
  if (coordPattern) {
    const lat = Number(coordPattern[1]);
    const lng = Number(coordPattern[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}
