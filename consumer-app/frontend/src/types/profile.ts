import type { ConsumerUser } from './index'

export type AchievementType = 'EARLY_ADOPTER' | 'ONE_YEAR_SOLAR' | 'REFERRAL_CHAMPION'

export interface AchievementItem {
  type: AchievementType
  title: string
  description: string
  unlocked: boolean
  unlockedAt: string | null
}

export interface MemberStatus {
  tier: ConsumerUser['memberTier']
  tierLabel: string
  points: number
  nextTier: ConsumerUser['memberTier'] | null
  nextTierLabel: string | null
  pointsToNextTier: number
  progressPercent: number
}

import type { SystemSpec } from './maintain'

export interface SystemStats {
  systemKw: number
  installedLabel: string
  co2TonsSaved: number
}

export interface CrmContact {
  prefix?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  phones?: string[]
  emails?: string[]
}

export interface CrmProfile {
  customerId: string
  customerType: 'RESIDENTIAL' | 'APARTMENT' | 'COMMERCIAL' | null
  prefix: string | null
  firstName: string | null
  middleName: string | null
  lastName: string | null
  companyName: string | null
  contactPerson: string | null
  phones: string[]
  emails: string[]
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  country: string | null
  pinCode: string | null
  contacts: CrmContact[]
}

export interface ConsumerProfile {
  user: ConsumerUser
  crmProfile: CrmProfile
  systemStats: SystemStats
  systemSpec: SystemSpec
  memberStatus: MemberStatus
  achievements: AchievementItem[]
}

export interface ConsumerNotification {
  id: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
