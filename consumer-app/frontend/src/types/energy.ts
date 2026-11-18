export type HourlyEnergyPoint = {
  hour: number
  label: string
  generated: number
  consumed: number
}

export interface EnergyReading {
  year: number
  month: number
  totalGenerated: number
  totalConsumed: number
  gridExport: number
  totalSavings: number
  dailyReadings: HourlyEnergyPoint[]
  isEstimated: boolean
  liveFromSolis?: boolean
  liveFromDeye?: boolean
  liveFromSunways?: boolean
  disclaimer: string | null
  systemKw: number
  /** IST YYYY-MM-DD — CRM net meter installation date */
  netMeterInstalledAt?: string | null
  /** False before net meter date (or when that date is not set yet) */
  generationActive?: boolean
}

export interface AnnualEnergyResponse {
  year: number
  months: EnergyReading[]
  isEstimated: boolean
  liveFromSolis?: boolean
  liveFromDeye?: boolean
  liveFromSunways?: boolean
  disclaimer: string | null
  netMeterInstalledAt?: string | null
  generationActive?: boolean
}

export interface DistributionSlice {
  name: string
  value: number
  percent: number
}
