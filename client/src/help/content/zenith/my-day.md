# My Day in Zenith

## My Day — personal productivity drawer

**My Day** is a private, cross-device productivity space available to every role. It is **fed by CRM context** (pipeline focus, Hit List, project pages) — not a standalone todo app. Open it with **Ctrl+Shift+M** (⌘⇧M) from any page, or click the **sunrise icon ☀** in the top navigation bar. A count badge on the icon shows how many incomplete tasks are waiting.

The drawer has three tabs:

| Tab | What it does |
| :-- | :-- |
| **Tasks** | **Your** personal to-do list: **Carry-overs** (older open items), **Today**, and **Done**. Add tasks at the bottom with an optional **project pin**. Pin CRM follow-ups from **Today's plan**, **Things needing attention**, or **Hit List** with **+ My Day** — they appear here as tasks (not as a separate **Suggested from CRM** feed). Tap a checkbox to complete; use the **⋯** menu to **Edit** or **Delete**. |
| **Journal** | A private daily note. One entry per day — type freely and it auto-saves after a short pause (look for the **Saved** / **Saving…** / **Retry** status). **Recent entries** load below the editor (newest first); use **Load more** when you have older notes. Each past entry can expand from a short preview. |
| **Reminders** | Tasks with a specific due date and the reminder flag set. **Overdue** reminders (any past due date) always appear under **Overdue**, not only from today onward. Grouped by urgency: **Overdue** (red), **Today** (amber), **This Week** (teal), and **Later** (grey). Add a new reminder with the date picker at the bottom. |

**CRM entry points (besides the ☀ icon):**

| Where | What |
| :-- | :-- |
| **Today’s Hit List** | **+ My Day** in **Actions** beside **Open →** — pins a follow-up, usually with that **project** attached. |
| **Today’s plan** (Zenith Today / KPIs) | **Suggested from CRM** rows with **+ My Day**; scroll for the full list ([Today’s plan](/help/dashboard#todays-plan-dashboard)). |
| **Things needing attention** (Zenith) | **+ My Day** on lifecycle brand gaps ([Things needing attention](/help/dashboard#things-needing-attention-dashboard)). |
| **Daily briefing** | **Your My Day** summary when the briefing opens ([Daily briefing](#daily-briefing-zenith)). |
| **Project detail** | **Your open My Day tasks** strip — complete or add follow-ups for that project ([Projects → Project detail](/help/modules#project-detail-page)). |

**Completing project-pinned tasks — optional remark:**

When a task has a **project pin**, you may tick **Log to project remarks when done** (shown on the task row in the drawer, and once for the whole strip on **Project detail**). Default is **on**; your choice is remembered per user in this browser. On complete, the CRM appends a remark like **`[My Day ✓] Call customer about subsidy`** under **Project detail → Remarks** (same API as manual remarks). Uncheck the box if you only want to clear the personal task without logging activity.

**Onboarding nudges:**

- **First visit** — A short **coach mark** may highlight the ☀ icon in the top nav (~1.4s after load) until dismissed once.
- **End of day** — Between about **4:30pm and 9pm**, if today’s **journal** is still empty, a bottom **banner** may invite you to open the **Journal** tab (dismissible for the day).

**Key behaviours:**
- All data is **private to your account** — no team sharing or collaboration.
- Data is stored on the server and **syncs across devices**: open My Day on another machine after logging in and your tasks, journal, and reminders are all there.
- On **mobile** the drawer is **full-screen** (slides up from the bottom). On **desktop** it slides in from the **right** as a side panel.
- Press **Esc** to close the drawer from any tab.
- **Edit** or **Delete** a task from the **⋯** menu on each row (not swipe gestures).
- **Project pin** on a task is a **link for your list**; optional remark logging is the only My Day action that writes to the shared project record.
- **My Day** requires a live connection — it does not use the Zenith offline queue.
