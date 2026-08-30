import { ConsumerMemberTier, type ConsumerUser } from '@prisma/client';

export const CONSUMER_JWT_ROLE = 'CONSUMER' as const;

export type ConsumerJwtPayload = {
  consumerId: string;
  username: string;
  role: typeof CONSUMER_JWT_ROLE;
};

export type ConsumerPublicUser = {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  projectId: string;
  referralCode: string;
  points: number;
  memberTier: ConsumerMemberTier;
  profileComplete: boolean;
  mustChangePassword: boolean;
};

const TIER_THRESHOLDS: { tier: ConsumerMemberTier; minPoints: number }[] = [
  { tier: ConsumerMemberTier.PLATINUM, minPoints: 2000 },
  { tier: ConsumerMemberTier.GOLD, minPoints: 1000 },
  { tier: ConsumerMemberTier.SILVER, minPoints: 500 },
  { tier: ConsumerMemberTier.BRONZE, minPoints: 0 },
];

export function tierFromPoints(points: number): ConsumerMemberTier {
  for (const { tier, minPoints } of TIER_THRESHOLDS) {
    if (points >= minPoints) return tier;
  }
  return ConsumerMemberTier.BRONZE;
}

export function generateReferralCode(nameSeed: string): string {
  const prefix = nameSeed
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 5)
    .toUpperCase()
    .padEnd(5, 'X');
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${suffix}`;
}

export function toConsumerPublicUser(user: ConsumerUser): ConsumerPublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    projectId: user.projectId,
    referralCode: user.referralCode,
    points: user.points,
    memberTier: user.memberTier,
    profileComplete: user.profileComplete,
    mustChangePassword: user.mustChangePassword,
  };
}

export function getConsumerJwtSecret(): string | null {
  const secret = process.env.CONSUMER_JWT_SECRET?.trim();
  return secret || null;
}
