import { describe, expect, it } from 'vitest';
import {
  CONSUMER_HELP_CATEGORIES,
  CONSUMER_HELP_FAQ_ITEMS,
  CONSUMER_HELP_FEATURED_FAQ_IDS,
  getConsumerHelpFeaturedFaqs,
} from './consumerHelpContent';
import { CONSUMER_HELP_ARTICLE_MANIFEST } from './consumerHelpArticles';
import {
  getConsumerHelpArticleFromRepo,
  getConsumerHelpPayloadFromRepo,
} from '../services/consumerHelpRepoService';
import { loadConsumerHelpArticleMarkdown } from '../utils/consumerHelpArticleLoader';

describe('consumerHelpContent', () => {
  it('covers every FAQ category', () => {
    const categoryIds = new Set(CONSUMER_HELP_CATEGORIES.map((c) => c.id));
    for (const faq of CONSUMER_HELP_FAQ_ITEMS) {
      expect(categoryIds.has(faq.category)).toBe(true);
    }
  });

  it('includes DISCOM and warranty priority topics', () => {
    const ids = new Set(CONSUMER_HELP_FAQ_ITEMS.map((f) => f.id));
    expect(ids.has('discom-net-meter-steps')).toBe(true);
    expect(ids.has('warranty-coverage')).toBe(true);
  });

  it('resolves featured FAQs', () => {
    const featured = getConsumerHelpFeaturedFaqs();
    expect(featured).toHaveLength(CONSUMER_HELP_FEATURED_FAQ_IDS.length);
    expect(featured[0]?.id).toBe('discom-net-meter-steps');
  });
});

describe('consumerHelpRepoService', () => {
  it('returns enriched repo payload', () => {
    const payload = getConsumerHelpPayloadFromRepo();
    expect(payload.categories.length).toBeGreaterThanOrEqual(8);
    expect(payload.faqs.length).toBeGreaterThanOrEqual(20);
    expect(payload.articles.length).toBeGreaterThanOrEqual(6);
    expect(payload.faqs[0]?.categoryLabel).toBeTruthy();
    expect(payload.featuredFaqIds).toContain('warranty-coverage');
  });

  it('loads markdown articles from repo', () => {
    for (const article of CONSUMER_HELP_ARTICLE_MANIFEST) {
      const markdown = loadConsumerHelpArticleMarkdown(article.id);
      expect(markdown).toBeTruthy();
      expect(markdown!.length).toBeGreaterThan(100);
    }

    const full = getConsumerHelpArticleFromRepo('warranty-guide');
    expect(full?.title).toBe('Rayenna warranty guide');
    expect(full?.markdown).toContain('## Standard coverage');
  });
});
