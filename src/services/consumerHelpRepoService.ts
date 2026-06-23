import {
  CONSUMER_HELP_CATEGORIES,
  CONSUMER_HELP_FAQ_ITEMS,
  CONSUMER_HELP_FEATURED_FAQ_IDS,
  getConsumerHelpCategoryLabel,
  type ConsumerHelpCategoryId,
} from '../constants/consumerHelpContent';
import {
  CONSUMER_HELP_ARTICLE_MANIFEST,
  CONSUMER_HELP_FAQ_ARTICLE_LINKS,
  getConsumerHelpArticleManifest,
} from '../constants/consumerHelpArticles';
import { loadConsumerHelpArticleMarkdown } from '../utils/consumerHelpArticleLoader';

export type ConsumerHelpCategoryDto = {
  id: ConsumerHelpCategoryId;
  label: string;
  description: string;
};

export type ConsumerHelpFaqDto = {
  id: string;
  category: ConsumerHelpCategoryId;
  categoryLabel: string;
  question: string;
  answer: string;
  articleId: string | null;
};

export type ConsumerHelpArticleSummaryDto = {
  id: string;
  title: string;
  subtitle: string;
  category: ConsumerHelpCategoryId;
  categoryLabel: string;
  readMinutes: number;
};

export type ConsumerHelpArticleDto = ConsumerHelpArticleSummaryDto & {
  markdown: string;
};

export type ConsumerHelpPayload = {
  categories: ConsumerHelpCategoryDto[];
  faqs: ConsumerHelpFaqDto[];
  articles: ConsumerHelpArticleSummaryDto[];
  featuredFaqIds: string[];
};

function categoryDtos(): ConsumerHelpCategoryDto[] {
  return CONSUMER_HELP_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
  }));
}

export function getConsumerHelpPayloadFromRepo(): ConsumerHelpPayload {
  return {
    categories: categoryDtos(),
    faqs: CONSUMER_HELP_FAQ_ITEMS.map((faq) => ({
      id: faq.id,
      category: faq.category,
      categoryLabel: getConsumerHelpCategoryLabel(faq.category),
      question: faq.question,
      answer: faq.answer,
      articleId: CONSUMER_HELP_FAQ_ARTICLE_LINKS[faq.id] ?? null,
    })),
    articles: CONSUMER_HELP_ARTICLE_MANIFEST.map((article) => ({
      id: article.id,
      title: article.title,
      subtitle: article.subtitle,
      category: article.category,
      categoryLabel: getConsumerHelpCategoryLabel(article.category),
      readMinutes: article.readMinutes,
    })),
    featuredFaqIds: [...CONSUMER_HELP_FEATURED_FAQ_IDS],
  };
}

export function getConsumerHelpArticleFromRepo(articleId: string): ConsumerHelpArticleDto | null {
  const manifest = getConsumerHelpArticleManifest(articleId);
  if (!manifest) return null;

  const markdown = loadConsumerHelpArticleMarkdown(articleId);
  if (!markdown) return null;

  return {
    id: manifest.id,
    title: manifest.title,
    subtitle: manifest.subtitle,
    category: manifest.category,
    categoryLabel: getConsumerHelpCategoryLabel(manifest.category),
    readMinutes: manifest.readMinutes,
    markdown,
  };
}
