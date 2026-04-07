/** Alphabetical; "Others" last — Project Lifecycle / inverter brand dropdown */
export const INVERTER_BRAND_OPTIONS = [
  'Delta',
  'Deye',
  'FIMER',
  'Fronius',
  'GoodWe',
  'Gronsol',
  'Growatt',
  'Havells',
  'Livguard',
  'Luminous',
  'Microtek',
  'Panasonic',
  'Polycab',
  'Solis',
  'Sungrow',
  'Tata Power Solar',
  'UTL Solar',
  'Others',
] as const

export type InverterBrandOption = (typeof INVERTER_BRAND_OPTIONS)[number]
