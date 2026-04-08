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
  'Selec',
  'Seltrik',
  'Solaire',
  'Solis',
  'Sungrow',
  'Tata Power Solar',
  'UTL Solar',
  'V-Guard',
  'Others',
] as const

export type InverterBrandOption = (typeof INVERTER_BRAND_OPTIONS)[number]
