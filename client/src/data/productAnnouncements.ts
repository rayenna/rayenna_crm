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
    id: 'ask-zenith',
    text: 'Ask Zenith — tap Ask Zenith in the header for a floating window (phone: Ask tab); on Zenith press / or A to open it.',
    showNewBadge: true,
  },
  {
    id: 'command-palette',
    text: 'Palette shortcut — press Ctrl+K (⌘K on Mac) anywhere to create, search, and jump to lists without digging through menus.',
  },
]
