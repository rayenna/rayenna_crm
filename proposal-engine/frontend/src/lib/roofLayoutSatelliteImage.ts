/** Google Static Maps "no imagery" / error tiles are ~7–12 KB; real zoom-19 tiles are hundreds of KB. */
export const PLACEHOLDER_SATELLITE_MAX_BYTES = 30_000;

export function isPlaceholderSatelliteBytes(byteLength: number): boolean {
  return byteLength > 0 && byteLength < PLACEHOLDER_SATELLITE_MAX_BYTES;
}

export function noSatelliteImageryMessage(latitude: number, longitude: number): string {
  return (
    `Google Maps has no satellite imagery for ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. ` +
    'Open the pin in Google Maps, verify Map GPS in Customer Master (longitude for Kerala is usually ~76.x), ' +
    'or paste a corrected full Maps URL on this page, then Regenerate.'
  );
}
