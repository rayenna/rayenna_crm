export const CONSUMER_SUPPORT_PHONE = process.env.CONSUMER_SUPPORT_PHONE || '+918045678900';
export const CONSUMER_SUPPORT_EMAIL =
  process.env.CONSUMER_SUPPORT_EMAIL || 'support@rayennaenergy.com';

export const CONSUMER_FAQ_ITEMS = [
  {
    id: 'maximize-savings',
    question: 'How do I maximize my solar savings?',
    category: 'Tips',
    answer:
      'Run high-load appliances (washing machine, water pump) during peak solar hours (10 AM–3 PM). Keep panels clean and monitor monthly generation in the Track tab.',
  },
  {
    id: 'net-metering',
    question: 'How does net metering work?',
    category: 'Billing',
    answer:
      'Excess solar units you export to the KSEB grid are credited against your consumption. Your bill reflects import minus export for the billing period.',
  },
  {
    id: 'monsoon-generation',
    question: 'Why is generation lower during monsoon?',
    category: 'Tips',
    answer:
      'Cloud cover and shorter sun hours reduce output between June and September. This is normal — annual totals still meet expectations over the year.',
  },
  {
    id: 'inverter-alarm',
    question: 'My inverter shows a warning light — what should I do?',
    category: 'Troubleshooting',
    answer:
      'Note the error code, check the inverter display manual, and use Report Issue in Maintain or Support if the warning persists more than a few hours.',
  },
] as const;

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

export type ConsumerFaqItem = (typeof CONSUMER_FAQ_ITEMS)[number];
export type ConsumerLearnTip = (typeof CONSUMER_LEARN_TIPS)[number];
