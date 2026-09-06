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
  referralSuccessCount: number
  referralChampionAt: number
  chatBotEnabled: boolean
}

export type ChatEscalate = 'emergency' | 'whatsapp' | 'ticket' | null

export interface ConsumerChatReply {
  sessionId: string
  reply: string
  escalate: ChatEscalate
  articleIds: string[]
}

export interface SupportTicketItem {
  id: string
  ticketNumber: string
  title: string
  description: string | null
  status: string
  source?: string
  createdAt: string
  updatedAt?: string
}

export interface SubmitSupportQueryInput {
  subject: string
  description?: string
}
