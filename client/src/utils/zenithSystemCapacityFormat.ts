/** Display system capacity (kW) in Zenith drawers and lists — matches Project detail “{n} kW”. */
export function formatZenithSystemCapacityKw(
  kw: number | null | undefined,
  whenEmpty: 'emDash' | 'notSet' = 'notSet',
): string {
  if (kw == null || kw === undefined || Number(kw) <= 0) {
    return whenEmpty === 'emDash' ? '—' : 'Not set'
  }
  return `${Number(kw)} kW`
}
