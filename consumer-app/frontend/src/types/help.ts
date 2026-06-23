export interface HelpCategory {
  id: string
  label: string
  description: string
}

export interface HelpFaqItem {
  id: string
  category: string
  categoryLabel: string
  question: string
  answer: string
  articleId: string | null
}

export interface HelpArticleSummary {
  id: string
  title: string
  subtitle: string
  category: string
  categoryLabel: string
  readMinutes: number
}

export interface HelpArticle extends HelpArticleSummary {
  markdown: string
}

export interface HelpPayload {
  categories: HelpCategory[]
  faqs: HelpFaqItem[]
  articles: HelpArticleSummary[]
  featuredFaqIds: string[]
}

export type HelpContextScreen = 'home' | 'track' | 'maintain' | 'help' | 'all'

export interface HelpContextSuggestion {
  id: string
  screens: HelpContextScreen[]
  articleId: string
  title: string
  subtitle: string
  reason: string
  priority: number
}

export interface HelpContextPayload {
  suggestions: HelpContextSuggestion[]
}
