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
    text: 'Ask Zenith — tap Ask Zenith in the header for a draggable floating window over the page you are on (phone: Ask tab). Drag the title, resize the corner, Esc to close.',
    showNewBadge: true,
  },
  {
    id: 'command-palette',
    text: 'Palette shortcut — press Ctrl+K (⌘K on Mac) anywhere to create, search, and jump to lists without digging through menus.',
  },
]
