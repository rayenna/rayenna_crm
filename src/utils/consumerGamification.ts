import { ConsumerAchievementType, ConsumerMemberTier } from '@prisma/client';
import { tierFromPoints } from './consumerAuth';

/** Rayenna founding — used for Early Adopter achievement eligibility. */
export const RAYENNA_FOUNDING_DATE = new Date('2017-01-01T00:00:00.000Z');
const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;

export const PROFILE_COMPLETE_POINTS = 100;

export const ACHIEVEMENT_POINTS: Record<ConsumerAchievementType, number> = {
  EARLY_ADOPTER: 50,
  ONE_YEAR_SOLAR: 75,
  REFERRAL_CHAMPION: 100,
};

export const ACHIEVEMENT_META: Record<
  ConsumerAchievementType,
  { title: string; description: string }
> = {
  EARLY_ADOPTER: {
    title: 'Early Adopter',
    description: 'Installed within 6 months of Rayenna founding',
  },
  ONE_YEAR_SOLAR: {
    title: '1 Year Solar',
    description: 'One year of clean solar energy',
  },
  REFERRAL_CHAMPION: {
    title: 'Referral Champion',
    description: '3 successful referrals',
  },
};

export const TIER_LABELS: Record<ConsumerMemberTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
};

const NEXT_TIER: Record<ConsumerMemberTier, ConsumerMemberTier | null> = {
  BRONZE: ConsumerMemberTier.SILVER,
  SILVER: ConsumerMemberTier.GOLD,
  GOLD: ConsumerMemberTier.PLATINUM,
  PLATINUM: null,
};

const TIER_FLOOR: Record<ConsumerMemberTier, number> = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 1000,
  PLATINUM: 2000,
};

export type MemberStatusDto = {
  tier: ConsumerMemberTier;
  tierLabel: string;
  points: number;
  nextTier: ConsumerMemberTier | null;
  nextTierLabel: string | null;
  pointsToNextTier: number;
  progressPercent: number;
};

export function memberStatusFromPoints(points: number): MemberStatusDto {
  const tier = tierFromPoints(points);
  const nextTier = NEXT_TIER[tier];
  if (!nextTier) {
    return {
      tier,
      tierLabel: TIER_LABELS[tier],
      points,
      nextTier: null,
      nextTierLabel: null,
      pointsToNextTier: 0,
      progressPercent: 100,
    };
  }

  const floor = TIER_FLOOR[tier];
  const ceiling = TIER_FLOOR[nextTier];
  const band = ceiling - floor;
  const inBand = Math.max(0, points - floor);
  const progressPercent = band > 0 ? Math.min(100, Math.round((inBand / band) * 100)) : 0;

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    points,
    nextTier,
    nextTierLabel: TIER_LABELS[nextTier],
    pointsToNextTier: Math.max(0, ceiling - points),
    progressPercent,
  };
}

export function isEarlyAdopterEligible(installDate: Date): boolean {
  const windowEnd = new Date(RAYENNA_FOUNDING_DATE.getTime() + SIX_MONTHS_MS);
  return installDate >= RAYENNA_FOUNDING_DATE && installDate <= windowEnd;
}

export function isOneYearSolarEligible(installDate: Date, asOf = new Date()): boolean {
  const anniversary = new Date(installDate);
  anniversary.setFullYear(anniversary.getFullYear() + 1);
  return asOf >= anniversary;
}

export function isReferralChampionEligible(referralSuccessCount: number): boolean {
  return referralSuccessCount >= 3;
}

/** kg CO₂ displaced per kWh (India grid average, approximate). */
export const CO2_KG_PER_KWH = 0.7;
