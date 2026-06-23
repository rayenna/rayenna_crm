-- Solar Hub Help Center — editable articles and FAQs (CRM admin)

CREATE TABLE "consumer_help_articles" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "subtitle" VARCHAR(500) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "readMinutes" INTEGER NOT NULL DEFAULT 5,
    "markdown" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_help_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consumer_help_faqs" (
    "id" TEXT NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "answer" TEXT NOT NULL,
    "articleId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumer_help_faqs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consumer_help_articles_category_idx" ON "consumer_help_articles"("category");
CREATE INDEX "consumer_help_articles_isPublished_sortOrder_idx" ON "consumer_help_articles"("isPublished", "sortOrder");

CREATE INDEX "consumer_help_faqs_category_idx" ON "consumer_help_faqs"("category");
CREATE INDEX "consumer_help_faqs_isPublished_sortOrder_idx" ON "consumer_help_faqs"("isPublished", "sortOrder");

ALTER TABLE "consumer_help_faqs" ADD CONSTRAINT "consumer_help_faqs_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "consumer_help_articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
