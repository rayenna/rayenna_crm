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
  disclaimer: string | null
  systemKw: number
}

export interface AnnualEnergyResponse {
  year: number
  months: EnergyReading[]
  isEstimated: boolean
  disclaimer: string | null
}

export interface DistributionSlice {
  name: string
  value: number
  percent: number
}
