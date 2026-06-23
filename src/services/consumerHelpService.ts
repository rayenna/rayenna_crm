import prisma from '../prisma';
import {
  getConsumerHelpCategoryLabel,
  type ConsumerHelpCategoryId,
} from '../constants/consumerHelpContent';
import {
  ensureConsumerHelpSeeded,
  seedConsumerHelpFromRepo,
} from './consumerHelpSeedService';
import {
  getConsumerHelpArticleFromRepo,
  getConsumerHelpPayloadFromRepo,
  type ConsumerHelpArticleDto,
  type ConsumerHelpArticleSummaryDto,
  type ConsumerHelpFaqDto,
  type ConsumerHelpPayload,
} from './consumerHelpRepoService';

export type {
  ConsumerHelpArticleDto,
  ConsumerHelpArticleSummaryDto,
  ConsumerHelpCategoryDto,
  ConsumerHelpFaqDto,
  ConsumerHelpPayload,
} from './consumerHelpRepoService';

function asCategoryId(value: string): ConsumerHelpCategoryId {
  return value as ConsumerHelpCategoryId;
}

async function mapDbToPayload(): Promise<ConsumerHelpPayload | null> {
  const [articles, faqs] = await Promise.all([
    prisma.consumerHelpArticle.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    }),
    prisma.consumerHelpFaq.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { question: 'asc' }],
    }),
  ]);

  if (articles.length === 0 && faqs.length === 0) {
    return null;
  }

  const repoCategories = getConsumerHelpPayloadFromRepo().categories;

  return {
    categories: repoCategories,
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: a.subtitle,
      category: asCategoryId(a.category),
      categoryLabel: getConsumerHelpCategoryLabel(asCategoryId(a.category)),
      readMinutes: a.readMinutes,
    })),
    faqs: faqs.map((f) => ({
      id: f.id,
      category: asCategoryId(f.category),
      categoryLabel: getConsumerHelpCategoryLabel(asCategoryId(f.category)),
      question: f.question,
      answer: f.answer,
      articleId: f.articleId,
    })),
    featuredFaqIds: faqs.filter((f) => f.isFeatured).map((f) => f.id),
  };
}

export async function getConsumerHelpPayload(): Promise<ConsumerHelpPayload> {
  const dbReady = await ensureConsumerHelpSeeded();
  if (!dbReady) return getConsumerHelpPayloadFromRepo();

  const fromDb = await mapDbToPayload();
  if (fromDb) return fromDb;
  return getConsumerHelpPayloadFromRepo();
}

export async function getConsumerHelpArticle(articleId: string): Promise<ConsumerHelpArticleDto | null> {
  const dbReady = await ensureConsumerHelpSeeded();
  if (!dbReady) return getConsumerHelpArticleFromRepo(articleId);

  const row = await prisma.consumerHelpArticle.findFirst({
    where: { id: articleId, isPublished: true },
  });

  if (row) {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      category: asCategoryId(row.category),
      categoryLabel: getConsumerHelpCategoryLabel(asCategoryId(row.category)),
      readMinutes: row.readMinutes,
      markdown: row.markdown,
    };
  }

  return getConsumerHelpArticleFromRepo(articleId);
}

export async function getConsumerHelpFeaturedFaqs(): Promise<ConsumerHelpFaqDto[]> {
  const payload = await getConsumerHelpPayload();
  const featured = new Set(payload.featuredFaqIds);
  return payload.faqs.filter((f) => featured.has(f.id));
}

// ─── Admin ─────────────────────────────────────────────────────────────────

export type ConsumerHelpArticleAdminDto = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  categoryLabel: string;
  readMinutes: number;
  markdown: string;
  isPublished: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type ConsumerHelpFaqAdminDto = {
  id: string;
  category: string;
  categoryLabel: string;
  question: string;
  answer: string;
  articleId: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  updatedAt: string;
};

export class ConsumerHelpNotMigratedError extends Error {
  constructor() {
    super('Help content tables are not migrated. Run prisma migrate deploy.');
    this.name = 'ConsumerHelpNotMigratedError';
  }
}

async function requireConsumerHelpDb(): Promise<void> {
  const ready = await ensureConsumerHelpSeeded();
  if (!ready) throw new ConsumerHelpNotMigratedError();
}

export async function listConsumerHelpArticlesAdmin(): Promise<ConsumerHelpArticleAdminDto[]> {
  await requireConsumerHelpDb();
  const rows = await prisma.consumerHelpArticle.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
  return rows.map(mapArticleAdmin);
}

export async function getConsumerHelpArticleAdmin(
  articleId: string,
): Promise<ConsumerHelpArticleAdminDto | null> {
  await requireConsumerHelpDb();
  const row = await prisma.consumerHelpArticle.findUnique({ where: { id: articleId } });
  return row ? mapArticleAdmin(row) : null;
}

export async function updateConsumerHelpArticleAdmin(
  articleId: string,
  input: {
    title?: string;
    subtitle?: string;
    category?: string;
    readMinutes?: number;
    markdown?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<ConsumerHelpArticleAdminDto> {
  const row = await prisma.consumerHelpArticle.update({
    where: { id: articleId },
    data: {
      title: input.title,
      subtitle: input.subtitle,
      category: input.category,
      readMinutes: input.readMinutes,
      markdown: input.markdown,
      isPublished: input.isPublished,
      sortOrder: input.sortOrder,
    },
  });
  return mapArticleAdmin(row);
}

export async function listConsumerHelpFaqsAdmin(): Promise<ConsumerHelpFaqAdminDto[]> {
  await requireConsumerHelpDb();
  const rows = await prisma.consumerHelpFaq.findMany({
    orderBy: [{ sortOrder: 'asc' }, { question: 'asc' }],
  });
  return rows.map(mapFaqAdmin);
}

export async function getConsumerHelpFaqAdmin(faqId: string): Promise<ConsumerHelpFaqAdminDto | null> {
  await requireConsumerHelpDb();
  const row = await prisma.consumerHelpFaq.findUnique({ where: { id: faqId } });
  return row ? mapFaqAdmin(row) : null;
}

export async function updateConsumerHelpFaqAdmin(
  faqId: string,
  input: {
    category?: string;
    question?: string;
    answer?: string;
    articleId?: string | null;
    isPublished?: boolean;
    isFeatured?: boolean;
    sortOrder?: number;
  },
): Promise<ConsumerHelpFaqAdminDto> {
  const row = await prisma.consumerHelpFaq.update({
    where: { id: faqId },
    data: {
      category: input.category,
      question: input.question,
      answer: input.answer,
      articleId: input.articleId,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      sortOrder: input.sortOrder,
    },
  });
  return mapFaqAdmin(row);
}

export async function reimportConsumerHelpFromRepo(): Promise<{ articlesUpserted: number; faqsUpserted: number }> {
  await requireConsumerHelpDb();
  return seedConsumerHelpFromRepo();
}

function mapArticleAdmin(row: {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  readMinutes: number;
  markdown: string;
  isPublished: boolean;
  sortOrder: number;
  updatedAt: Date;
}): ConsumerHelpArticleAdminDto {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    categoryLabel: getConsumerHelpCategoryLabel(asCategoryId(row.category)),
    readMinutes: row.readMinutes,
    markdown: row.markdown,
    isPublished: row.isPublished,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapFaqAdmin(row: {
  id: string;
  category: string;
  question: string;
  answer: string;
  articleId: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  updatedAt: Date;
}): ConsumerHelpFaqAdminDto {
  return {
    id: row.id,
    category: row.category,
    categoryLabel: getConsumerHelpCategoryLabel(asCategoryId(row.category)),
    question: row.question,
    answer: row.answer,
    articleId: row.articleId,
    isPublished: row.isPublished,
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt.toISOString(),
  };
}
