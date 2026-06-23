export type HubHelpCategory = {
  id: string
  label: string
  description: string
}

export type HubHelpArticleAdmin = {
  id: string
  title: string
  subtitle: string
  category: string
  categoryLabel: string
  readMinutes: number
  markdown: string
  isPublished: boolean
  sortOrder: number
  updatedAt: string
}

export type HubHelpFaqAdmin = {
  id: string
  category: string
  categoryLabel: string
  question: string
  answer: string
  articleId: string | null
  isPublished: boolean
  isFeatured: boolean
  sortOrder: number
  updatedAt: string
}

export type HubHelpArticleListResponse = {
  items: HubHelpArticleAdmin[]
}

export type HubHelpFaqListResponse = {
  items: HubHelpFaqAdmin[]
}

export type HubHelpCategoriesResponse = {
  categories: HubHelpCategory[]
}
