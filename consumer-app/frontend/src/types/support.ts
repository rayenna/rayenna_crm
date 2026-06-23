export interface SupportFaqItem {
  id: string
  question: string
  category: string
  answer: string
}

export interface LearnTipItem {
  id: string
  title: string
  subtitle: string
  readMinutes: number
}

export interface SupportMeta {
  emergencyPhone: string
  supportEmail: string
  referralCode: string
  referralRewardLabel: string
}

export interface SupportTicketItem {
  id: string
  ticketNumber: string
  title: string
  description: string | null
  status: string
  createdAt: string
}

export interface SubmitSupportQueryInput {
  subject: string
  description?: string
}
