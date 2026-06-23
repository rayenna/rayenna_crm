export const CONSUMER_SUPPORT_PHONE = process.env.CONSUMER_SUPPORT_PHONE || '+918045678900';
export const CONSUMER_SUPPORT_EMAIL =
  process.env.CONSUMER_SUPPORT_EMAIL || 'support@rayennaenergy.com';

export const CONSUMER_LEARN_TIPS = [
  {
    id: 'monsoon-tips',
    title: 'Monsoon Solar Tips',
    subtitle: 'Maximize savings during rainy season',
    readMinutes: 3,
  },
  {
    id: 'understanding-bill',
    title: 'Understanding Your Bill',
    subtitle: 'Complete guide to solar billing',
    readMinutes: 5,
  },
] as const;

export type ConsumerLearnTip = (typeof CONSUMER_LEARN_TIPS)[number];
