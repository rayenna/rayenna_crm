export interface ConsumerUser {
  id: string
  username: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  projectId: string
  referralCode: string
  points: number
  memberTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  profileComplete: boolean
}

export interface ConsumerAuthResponse {
  token: string
  user: ConsumerUser
}

export type { HourlyEnergyPoint } from './energy'
export type { EnergyReading, AnnualEnergyResponse, DistributionSlice } from './energy'
