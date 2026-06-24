/** Product / UX announcements shown in the Zenith AI Insights ticker (and formerly on Legacy Dashboard). */
export interface ProductAnnouncementDef {
  id: string
  text: string
  showNewBadge?: boolean
}

export const PRODUCT_ANNOUNCEMENTS: ProductAnnouncementDef[] = [
  {
    id: 'my-day',
    text: 'New: My Day — your personal Tasks, Journal & Reminders drawer; press Ctrl+Shift+M (⌘⇧M) or tap the ☀ icon in the top bar from any page.',
    showNewBadge: true,
  },
  {
    id: 'zenith-default',
    text: 'Zenith is now your default Command Centre & Dashboard! 🚀 Prefer the old view? You can still find the Legacy Dashboard under the More section',
  },
]
