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

export interface SystemStats {
  systemKw: number
  installedLabel: string
  co2TonsSaved: number
}

export interface ConsumerProfile {
  user: ConsumerUser
  systemStats: SystemStats
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

export interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  phone?: string
}
