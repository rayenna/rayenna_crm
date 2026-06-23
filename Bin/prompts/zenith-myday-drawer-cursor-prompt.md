# Cursor Prompt — Zenith "My Day" Drawer (Mobile-First, Non-Breaking)

---

## Prime Directive

**Do not modify any existing component, route, or database table.**
All new code lives in new files. Integration points are additive only — you are inserting `<MyDayButton />` and `<MyDayDrawer />` into existing layouts, not refactoring them. If anything existing would need to change in a way that could break it, stop and flag it instead.

---

## What We Are Building

A personal productivity drawer called **"My Day"** — accessible from the Zenith morning briefing popup and from a persistent icon in the top navigation bar. It contains three tabs: Tasks, Journal, and Reminders. All data is private to the logged-in user. No shared state. No collaboration.

---

## Mobile-First Rules (Apply Everywhere)

- Design for 375px width first. Scale up with `min-width` breakpoints — never `max-width` only.
- Touch targets: minimum `44px × 44px` for all interactive elements (checkboxes, buttons, tab items).
- The drawer is **full-screen on mobile** (`position: fixed; inset: 0`), a **right-side panel on desktop** (width `420px`, slides in from right).
- Font sizes: minimum `14px` for body text on mobile. Labels/meta: minimum `11px`.
- No hover-only states — all interactions must also work on tap.
- Inputs must not cause page zoom on iOS — set `font-size: 16px` on all `<input>` and `<textarea>` elements.
- Avoid `100vh` on mobile — use `100dvh` (dynamic viewport height) to account for browser chrome.
- Keyboard: when a text input is focused on mobile, the drawer should not collapse or shift layout unexpectedly. Use `env(safe-area-inset-bottom)` for bottom padding where relevant.

---

## File Structure

Create these new files only. Do not touch anything else unless explicitly listed under "Integration Points".

```
components/
  my-day/
    MyDayDrawer.tsx         ← main drawer shell (tabs, open/close, animation)
    MyDayButton.tsx         ← the trigger button (used in briefing + nav)
    tabs/
      TasksTab.tsx          ← tasks checklist tab
      JournalTab.tsx        ← journal/notes tab
      RemindersTab.tsx      ← reminders tab
    components/
      TaskItem.tsx          ← single task row
      JournalEntry.tsx      ← single past journal entry
      ReminderItem.tsx      ← single reminder row
      ProjectPinBadge.tsx   ← small pill showing pinned project name
      AddTaskInput.tsx      ← add task input row with project pin selector
    hooks/
      useMyDay.ts           ← all data fetching, mutations, local state
    types.ts                ← TypeScript interfaces for this feature

lib/
  my-day-api.ts             ← client-side API helpers (fetch wrappers)

app/api/my-day/
  tasks/route.ts            ← GET + POST + PATCH /api/my-day/tasks
  journal/route.ts          ← GET + POST /api/my-day/journal
  reminders/route.ts        ← GET + POST + PATCH /api/my-day/reminders

(If not using Next.js App Router, adjust to your existing API pattern)

db/migrations/
  YYYYMMDD_add_my_day_tables.sql   ← migration file — tables only, no changes to existing
```

---

## Database — New Tables Only

Add these tables via migration. **Do not alter any existing table.**

```sql
-- User tasks (checklist items)
CREATE TABLE user_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,             -- FK to your existing users table (read-only ref)
  content       TEXT NOT NULL,
  is_done       BOOLEAN NOT NULL DEFAULT false,
  due_date      DATE,                      -- nullable, for reminders tab
  is_reminder   BOOLEAN NOT NULL DEFAULT false,
  project_id    TEXT,                      -- nullable FK to your existing projects table
  project_label TEXT,                      -- denormalised label — avoids JOIN on read
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- User journal entries (one per day, keyed by user + date)
CREATE TABLE user_journal (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  entry_date DATE NOT NULL,
  content    TEXT NOT NULL DEFAULT '',
  project_id    TEXT,
  project_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

-- Indexes
CREATE INDEX ON user_tasks (user_id, due_date);
CREATE INDEX ON user_tasks (user_id, is_reminder, due_date);
CREATE INDEX ON user_journal (user_id, entry_date DESC);
```

**Note to Cursor:** `project_id` and `project_label` are nullable. When a task or journal entry is pinned to a project, store both the id and the display label so you never need a JOIN to render the badge. The project list for the pin selector should come from your existing projects data source — read-only, no writes to projects table.

---

## API Routes

All routes require the authenticated user's `user_id`. Use whatever auth pattern already exists in the project (session, JWT, cookie — match it exactly).

### `GET /api/my-day/tasks`
Returns tasks for today and incomplete tasks from previous days.
```json
[
  {
    "id": "uuid",
    "content": "Call KSEB liaison re: net metering delay",
    "is_done": false,
    "due_date": null,
    "is_reminder": false,
    "project_id": "proj_123",
    "project_label": "Thrissur Grid",
    "created_at": "2026-05-07T08:00:00Z",
    "sort_order": 0
  }
]
```

### `POST /api/my-day/tasks`
Create a new task.
```json
{ "content": "string", "due_date": "YYYY-MM-DD | null", "is_reminder": false, "project_id": "string | null", "project_label": "string | null" }
```

### `PATCH /api/my-day/tasks/[id]`
Update `is_done`, `content`, or `sort_order`. Partial updates only — only send changed fields.

### `GET /api/my-day/journal?date=YYYY-MM-DD`
Returns the journal entry for the given date (or today if no date param). Also returns the 5 most recent past entries.
```json
{
  "today": { "id": "uuid", "entry_date": "2026-05-07", "content": "...", "project_label": null },
  "recent": [ ... ]
}
```

### `POST /api/my-day/journal`
Upsert today's entry (INSERT ... ON CONFLICT (user_id, entry_date) DO UPDATE).
```json
{ "entry_date": "YYYY-MM-DD", "content": "string", "project_id": "string | null", "project_label": "string | null" }
```

### `GET /api/my-day/reminders`
Returns upcoming reminders (tasks where `is_reminder = true` and `due_date >= today`), sorted by `due_date` asc.

### `POST /api/my-day/reminders`
Same as POST tasks but always sets `is_reminder: true`. Requires `due_date`.

---

## Component Specs

### `MyDayDrawer.tsx`

The shell. Handles open/close state, animation, tab switching, and backdrop.

```
Behaviour:
- Closed by default
- Opens via: (a) MyDayButton click, (b) global keyboard shortcut Cmd/Ctrl + Shift + M
- On mobile: full-screen overlay, slides up from bottom
- On desktop (≥768px): fixed right panel, 420px wide, slides in from right
- Backdrop: semi-transparent overlay behind drawer on mobile, none on desktop
- Close triggers: X button, Escape key, backdrop tap (mobile)
- Remembers last active tab across opens (localStorage key: 'zenith_myday_last_tab')
- Does NOT unmount on close — keeps state in memory to avoid re-fetch on re-open
- Shows a small unread badge on the MyDayButton if there are incomplete tasks

Structure:
┌─────────────────────────┐
│ Header: "My Day" + date + close (X) │
├─────────────────────────┤
│ Tabs: Tasks | Journal | Reminders  │
├─────────────────────────┤
│ Tab content (scrollable)           │
└─────────────────────────┘
```

Animation: use CSS `transform: translateX(100%)` → `translateX(0)` for desktop, `translateY(100%)` → `translateY(0)` for mobile. Use `transition: transform 240ms cubic-bezier(0.4, 0, 0.2, 1)`. No JS animation libraries.

### `MyDayButton.tsx`

```tsx
interface MyDayButtonProps {
  variant: 'briefing' | 'nav'
  // briefing: amber ghost button style matching the briefing popup
  // nav: compact icon-only button for the top navigation bar
}
```

- `briefing` variant: matches the amber ghost style shown in the popup — `📝 My Day` label, same height as "Got it →"
- `nav` variant: icon-only (pencil/note icon), 36×36px, shows a dot badge if there are open tasks

### `TasksTab.tsx`

```
Layout (mobile-first):
- Section label: "Today" (Space Mono, 9px, uppercase, muted)
- List of TaskItem components
- Incomplete tasks from previous days shown under "Carry-overs" section label
- AddTaskInput at the bottom, always visible (not inside the scroll area — sticky at bottom)
- Empty state: "Nothing planned yet. Add your first task below." in muted text

Behaviour:
- Tap checkbox → optimistic toggle, PATCH /api/my-day/tasks/[id]
- Done items move to bottom of list with strikethrough
- Done items from previous days are hidden (not shown)
- Drag to reorder (desktop only — use existing dnd library if one is already in the project, otherwise skip reorder entirely)
```

### `TaskItem.tsx`

```
Layout:
[ circle checkbox ] [ task text ] [ project pin badge? ] [ ... menu ]

- Checkbox: 20×20px circle, border 1.5px. Tapping animates fill → green (#1D9E75)
- Task text: 14px, line-height 1.5. Strikethrough + muted on done.
- ProjectPinBadge: shown only if task has a project_label
- "..." menu (on long-press mobile / hover desktop): shows "Edit" and "Delete" options only
- Delete: optimistic removal, call DELETE /api/my-day/tasks/[id]
```

### `AddTaskInput.tsx`

```
Layout (stacked on mobile, inline on desktop ≥480px):
[ + ] [ text input "Add a task…" ] [ project selector ▾ ] [ Add ]

- Project selector: a <select> populated from your existing projects list
- On mobile: project selector appears below the text input as a full-width dropdown
- Submits on Enter key or "Add" button tap
- Clears input after submit, keeps project selection
- Minimum touch target for Add button: 44px height
```

### `JournalTab.tsx`

```
Layout:
- Today's textarea at top (always visible)
- "Pin to project" button below textarea
- "Save" button — debounced auto-save after 2s of inactivity (also manual save button)
- Divider: "Earlier"
- Past entries (JournalEntry components), newest first, max 10 shown
- "Load more" text button if more than 10 exist

Auto-save behaviour:
- onChange → set a 2000ms debounce timer → POST /api/my-day/journal
- Show "Saved" in muted text for 2s after successful save, then hide
- Show "Saving…" while in-flight
- On unmount (tab switch / drawer close), flush any pending save immediately
```

### `JournalEntry.tsx`

```
Layout:
┌─────────────────────────────┐
│ WED 06 MAY 2026   [project badge?] │
│ Entry text (truncated to 3 lines)  │
│ [Expand ▾]                         │
└─────────────────────────────┘

- Date: Space Mono, 9px, uppercase, muted
- Text: 13px, line-height 1.6, max 3 lines collapsed
- Expand/collapse toggle if text exceeds 3 lines
- Tapping the entry does NOT open an edit mode — past entries are read-only in this view
```

### `RemindersTab.tsx`

```
Layout:
- Upcoming reminders sorted by date, grouped by: Today / This Week / Later
- Each ReminderItem shows date badge + content + project pin
- "Add reminder" input at bottom with date picker
- Overdue reminders shown in red at top under "Overdue" section

Empty state: "No upcoming reminders." in muted text
```

### `ReminderItem.tsx`

```
Layout:
[ date badge ] [ content ] [ project pin? ] [ delete ]

Date badge: small card showing month (3-letter) + day number
Colour-coded by urgency:
  - Today or overdue → amber (#EF9F27 tint)
  - Within 7 days → blue (#378ADD tint)
  - Further out → teal (#1D9E75 tint)
```

---

## Visual Style

Match Zenith's existing dark theme exactly.

```
Background (drawer):      #0f1623
Header / tab bar:         #161d2b
Borders:                  rgba(255, 255, 255, 0.07) — 0.5px
Tab active indicator:     #EF9F27 (amber), 2px bottom border
Tab active text:          #EF9F27
Tab inactive text:        rgba(255, 255, 255, 0.3)
Section labels:           Space Mono, 9px, 700, uppercase, rgba(255,255,255,0.25)
Body text:                rgba(255, 255, 255, 0.7), 14px
Muted / meta text:        rgba(255, 255, 255, 0.3), 11px
Checkbox done fill:       #1D9E75
Project pin badge bg:     rgba(55, 138, 221, 0.12)
Project pin badge text:   #85B7EB
Project pin badge border: rgba(55, 138, 221, 0.25)
Input background:         rgba(255, 255, 255, 0.04)
Input border:             rgba(255, 255, 255, 0.08)
Input text:               rgba(255, 255, 255, 0.7)
Input placeholder:        rgba(255, 255, 255, 0.2)
Primary button:           background #EF9F27, text #0f1623
Ghost button (amber):     background rgba(239,159,39,0.12), text #EF9F27, border rgba(239,159,39,0.3)
Font — labels:            Space Mono (already imported)
Font — body:              Match whatever font is already used in Zenith
```

---

## State Management

Use local component state + the `useMyDay` hook. Do not use Redux, Zustand, or any global store unless one is already used in the project — in that case, match the existing pattern.

```ts
// hooks/useMyDay.ts
export function useMyDay() {
  // tasks
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)

  // journal
  const [journalToday, setJournalToday] = useState<JournalEntry | null>(null)
  const [journalRecent, setJournalRecent] = useState<JournalEntry[]>([])

  // reminders
  const [reminders, setReminders] = useState<Reminder[]>([])

  // optimistic updates: apply change to local state immediately,
  // then call API in background, revert on error
  const toggleTask = (id: string) => { ... }
  const addTask = (content: string, projectId?: string, projectLabel?: string) => { ... }
  const deleteTask = (id: string) => { ... }
  const saveJournal = (content: string, projectId?: string) => { ... }  // debounced
  const addReminder = (content: string, dueDate: string, projectId?: string) => { ... }

  return { tasks, tasksLoading, toggleTask, addTask, deleteTask,
           journalToday, journalRecent, saveJournal,
           reminders, addReminder }
}
```

---

## Integration Points

These are the ONLY changes to existing files. Make them additive — one import and one JSX line each.

### 1. Morning Briefing Popup

Find the existing briefing/popup component (likely named something like `BriefingModal`, `MorningBriefing`, or `DayStartPopup`).

In the footer area, next to the existing "Got it →" button, add:

```tsx
import { MyDayButton } from '@/components/my-day/MyDayButton'

// Inside the footer JSX, before the "Got it" button:
<MyDayButton variant="briefing" onClick={() => setMyDayOpen(true)} />
```

The `setMyDayOpen` state lives in the parent that renders both the briefing and the drawer, or in a context if one exists.

### 2. Top Navigation Bar

Find the existing top nav component. Add the nav variant icon button to the right side of the nav (before the user avatar / profile button):

```tsx
import { MyDayButton } from '@/components/my-day/MyDayButton'

// In the right section of the nav:
<MyDayButton variant="nav" onClick={() => setMyDayOpen(true)} />
```

### 3. Drawer Mount Point

In the root layout file (e.g. `app/layout.tsx` or the dashboard layout), add the drawer once so it's available everywhere:

```tsx
import { MyDayDrawer } from '@/components/my-day/MyDayDrawer'

// At the bottom of the layout, before closing </body> or layout wrapper:
<MyDayDrawer isOpen={myDayOpen} onClose={() => setMyDayOpen(false)} />
```

Manage `myDayOpen` state with a React context (create `MyDayContext.tsx`) so the button and drawer don't need prop-drilling through many layers.

---

## MyDayContext.tsx (new file)

```tsx
// context/MyDayContext.tsx
'use client'
import { createContext, useContext, useState } from 'react'

const MyDayContext = createContext<{
  isOpen: boolean
  open: () => void
  close: () => void
}>({ isOpen: false, open: () => {}, close: () => {} })

export function MyDayProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <MyDayContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </MyDayContext.Provider>
  )
}

export const useMyDayContext = () => useContext(MyDayContext)
```

Wrap the dashboard layout with `<MyDayProvider>`. Both `MyDayButton` and `MyDayDrawer` import `useMyDayContext` — no props needed.

---

## TypeScript Interfaces

```ts
// components/my-day/types.ts

export interface Task {
  id: string
  content: string
  isDone: boolean
  dueDate: string | null
  isReminder: boolean
  projectId: string | null
  projectLabel: string | null
  createdAt: string
  sortOrder: number
}

export interface JournalEntry {
  id: string
  entryDate: string          // YYYY-MM-DD
  content: string
  projectId: string | null
  projectLabel: string | null
  updatedAt: string
}

export type Reminder = Task  // reminders are tasks with isReminder: true and a dueDate
```

---

## Error Handling

- All API calls: wrap in try/catch. On error, revert the optimistic update and show a brief toast/snackbar. Use whatever toast system already exists in Zenith — do not install a new one.
- If no toast system exists: show a small inline error message below the relevant input for 3 seconds, then clear it.
- Network failure on journal auto-save: retry once after 5 seconds. If second attempt fails, show "Failed to save — click to retry" inline.
- Empty API responses: show appropriate empty states, never crash.

---

## Things Cursor Must NOT Do

- Do not install new npm packages unless absolutely required (fast-xml-parser and cheerio are already being added for the solar ticker — those are fine).
- Do not modify the database schema of any existing table.
- Do not modify any existing API route.
- Do not modify the existing BriefingModal/MorningBriefing component's logic — only add the button.
- Do not add global CSS that could affect existing components — scope all styles to the my-day components.
- Do not use `!important` anywhere.
- Do not use `z-index` values above 1000 unless the existing project already uses values in that range — check first.
- Do not add `position: fixed` inside any component that is not the drawer shell itself.

---

## Acceptance Criteria

- [ ] Drawer opens from the briefing popup "My Day" button
- [ ] Drawer opens from the top nav icon
- [ ] Drawer opens with Cmd/Ctrl + Shift + M keyboard shortcut
- [ ] On mobile (375px): drawer is full-screen, slides up from bottom
- [ ] On desktop (≥768px): drawer is a 420px right panel, slides in from right
- [ ] All touch targets are ≥ 44×44px
- [ ] Inputs do not trigger zoom on iOS (font-size ≥ 16px)
- [ ] Tasks tab: can add, check off, and delete tasks
- [ ] Tasks tab: can pin a task to a project
- [ ] Journal tab: auto-saves after 2s of inactivity
- [ ] Journal tab: past entries are visible and read-only
- [ ] Reminders tab: can add a reminder with a date
- [ ] Reminders tab: colour-coded by urgency
- [ ] Closing and reopening the drawer preserves the last active tab
- [ ] No existing Zenith features are broken
- [ ] No TypeScript errors introduced
- [ ] No console errors or warnings in browser
- [ ] Works in both Chrome and Safari (mobile)
