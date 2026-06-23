import type { ConsumerHelpCategoryId } from './consumerHelpContent';

export type ConsumerHelpArticleManifest = {
  id: string;
  title: string;
  subtitle: string;
  category: ConsumerHelpCategoryId;
  readMinutes: number;
};

/** Markdown files live in src/content/consumer-help/{id}.md */
export const CONSUMER_HELP_ARTICLE_MANIFEST: ConsumerHelpArticleManifest[] = [
  {
    id: 'kseb-net-metering-guide',
    title: 'KSEB net metering guide',
    subtitle: 'DISCOM steps from application to solar billing',
    category: 'discom',
    readMinutes: 6,
  },
  {
    id: 'warranty-guide',
    title: 'Rayenna warranty guide',
    subtitle: 'Coverage, exclusions, and how to claim',
    category: 'warranty',
    readMinutes: 5,
  },
  {
    id: 'understanding-solar-bill',
    title: 'Understanding your solar bill',
    subtitle: 'Import, export, and how Track compares to KSEB',
    category: 'energy',
    readMinutes: 5,
  },
  {
    id: 'monsoon-solar-tips',
    title: 'Monsoon solar tips',
    subtitle: 'What to expect June–September in Kerala',
    category: 'energy',
    readMinutes: 3,
  },
  {
    id: 'panel-cleaning-guide',
    title: 'Panel cleaning guide',
    subtitle: 'Your Rayenna visit schedule and safety',
    category: 'maintenance',
    readMinutes: 4,
  },
  {
    id: 'inverter-troubleshooting',
    title: 'Inverter troubleshooting',
    subtitle: 'Error codes, safe checks, and when to report',
    category: 'troubleshooting',
    readMinutes: 4,
  },
];

/** FAQ id → full article for "Read guide" links. */
export const CONSUMER_HELP_FAQ_ARTICLE_LINKS: Record<string, string> = {
  'discom-net-meter-steps': 'kseb-net-metering-guide',
  'warranty-coverage': 'warranty-guide',
  'warranty-claim': 'warranty-guide',
  'net-metering-basics': 'understanding-solar-bill',
  'monsoon-generation': 'monsoon-solar-tips',
  'panel-cleaning-schedule': 'panel-cleaning-guide',
  'inverter-alarm': 'inverter-troubleshooting',
  'no-generation-data': 'inverter-troubleshooting',
};

export function getConsumerHelpArticleManifest(
  articleId: string,
): ConsumerHelpArticleManifest | undefined {
  return CONSUMER_HELP_ARTICLE_MANIFEST.find((a) => a.id === articleId);
}

export function isConsumerHelpArticleId(articleId: string): boolean {
  return CONSUMER_HELP_ARTICLE_MANIFEST.some((a) => a.id === articleId);
}
