import {
  CONSUMER_HELP_FAQ_ITEMS,
  CONSUMER_HELP_FEATURED_FAQ_IDS,
} from '../constants/consumerHelpContent';
import {
  CONSUMER_HELP_ARTICLE_MANIFEST,
  CONSUMER_HELP_FAQ_ARTICLE_LINKS,
} from '../constants/consumerHelpArticles';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { loadConsumerHelpArticleMarkdown } from '../utils/consumerHelpArticleLoader';

export type ConsumerHelpSeedSummary = {
  articlesUpserted: number;
  faqsUpserted: number;
};

export function isConsumerHelpTableMissingError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2021' &&
    String(err.meta?.table ?? '').includes('consumer_help')
  );
}

/** True when migration has been applied and help tables exist. */
export async function isConsumerHelpDbReady(): Promise<boolean> {
  try {
    await prisma.consumerHelpArticle.count();
    return true;
  } catch (err) {
    if (isConsumerHelpTableMissingError(err)) return false;
    throw err;
  }
}

/** Import repo markdown + constants into Neon (idempotent upsert). */
export async function seedConsumerHelpFromRepo(): Promise<ConsumerHelpSeedSummary> {
  const featuredSet = new Set<string>(CONSUMER_HELP_FEATURED_FAQ_IDS);

  let articlesUpserted = 0;
  for (let i = 0; i < CONSUMER_HELP_ARTICLE_MANIFEST.length; i += 1) {
    const article = CONSUMER_HELP_ARTICLE_MANIFEST[i];
    const markdown = loadConsumerHelpArticleMarkdown(article.id);
    if (!markdown) {
      throw new Error(`Missing markdown for help article: ${article.id}`);
    }

    await prisma.consumerHelpArticle.upsert({
      where: { id: article.id },
      create: {
        id: article.id,
        title: article.title,
        subtitle: article.subtitle,
        category: article.category,
        readMinutes: article.readMinutes,
        markdown,
        isPublished: true,
        sortOrder: i,
      },
      update: {
        title: article.title,
        subtitle: article.subtitle,
        category: article.category,
        readMinutes: article.readMinutes,
        markdown,
        sortOrder: i,
      },
    });
    articlesUpserted += 1;
  }

  let faqsUpserted = 0;
  for (let i = 0; i < CONSUMER_HELP_FAQ_ITEMS.length; i += 1) {
    const faq = CONSUMER_HELP_FAQ_ITEMS[i];
    const articleId = CONSUMER_HELP_FAQ_ARTICLE_LINKS[faq.id] ?? null;

    await prisma.consumerHelpFaq.upsert({
      where: { id: faq.id },
      create: {
        id: faq.id,
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        articleId,
        isPublished: true,
        isFeatured: featuredSet.has(faq.id),
        sortOrder: i,
      },
      update: {
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        articleId,
        isFeatured: featuredSet.has(faq.id),
        sortOrder: i,
      },
    });
    faqsUpserted += 1;
  }

  return { articlesUpserted, faqsUpserted };
}

export async function consumerHelpDbIsEmpty(): Promise<boolean> {
  const [articleCount, faqCount] = await Promise.all([
    prisma.consumerHelpArticle.count(),
    prisma.consumerHelpFaq.count(),
  ]);
  return articleCount === 0 && faqCount === 0;
}

export async function ensureConsumerHelpSeeded(): Promise<boolean> {
  if (!(await isConsumerHelpDbReady())) return false;
  if (await consumerHelpDbIsEmpty()) {
    await seedConsumerHelpFromRepo();
  }
  return true;
}
