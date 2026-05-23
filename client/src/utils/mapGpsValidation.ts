/** Keep in sync with `src/utils/mapGpsValidation.ts`. */
export const KERALA_LAT_MIN = 8;
export const KERALA_LAT_MAX = 13;
export const KERALA_SATELLITE_LNG_MIN = 76;

export function getKeralaMapGpsWarning(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < KERALA_LAT_MIN || latitude > KERALA_LAT_MAX) return null;
  if (longitude >= KERALA_SATELLITE_LNG_MIN) return null;
  if (longitude < 74.5) return null;

  return (
    `Map GPS for Kerala (latitude ${latitude.toFixed(4)}°) has longitude ${longitude.toFixed(4)}° — ` +
    `west of ${KERALA_SATELLITE_LNG_MIN}°. Google satellite imagery often fails here; most Kerala sites use ` +
    `~76.2°–77.4°E. Open the pin in Google Maps and correct it before AI Roof Layout.`
  );
}
