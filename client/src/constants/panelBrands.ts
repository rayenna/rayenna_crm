/** Alphabetical; "Others" last — Project Lifecycle / panel brand dropdown */
export const PANEL_BRAND_OPTIONS = [
  'Adani Solar',
  'Azure Power',
  'Emmvee',
  'Goldi Solar',
  'Hartek Group',
  'Jakson',
  'L&T Solar',
  'Loom Solar',
  'Luminous',
  'Microtek',
  'Moser Baer',
  'Premier Energies',
  'Rayzon Solar',
  'ReNew',
  'Renewsys',
  'Saatvik',
  'Servotech',
  'Tata Power Solar',
  'V-Guard',
  'Vikram Solar',
  'Waaree',
  'Others',
] as const

export type PanelBrandOption = (typeof PANEL_BRAND_OPTIONS)[number]
