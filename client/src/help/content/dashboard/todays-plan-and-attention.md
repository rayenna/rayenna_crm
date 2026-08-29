# Today's plan and Things needing attention

These cards live on **Zenith ✦** (Today / KPIs), not on the classic Dashboard. Open them from **Dashboard** menu → **Zenith ✦**, or **Ctrl+Shift+Z** / **⌘⇧Z**.

## Today's plan (Zenith)

The **Today's plan** card (sun icon) shows:

- **Summary** — Short lines from your **My Day** snapshot (open tasks, reminders, whether you started today’s journal).
- **Suggested from CRM** — Follow-ups from pipeline logic (Hit List–style deals, payment overdue, delayed installs, support tickets, **Needs review** date/payment flags, **lifecycle brand gaps** where your role receives them). One-tap **+ My Day** per suggestion. After pinning, the row stays visible and the button shows **✓ My Day** (teal); clicking again does **not** create a duplicate (**one open task per project**). **Scroll** inside the card for more suggestions.
- **Tasks** / **Open My Day** — Opens the ☀ drawer on the **Tasks** tab (pinned and manual tasks only — not a duplicate CRM list).

**Who sees it:** Roles that use Zenith (layout varies). On Sales / Admin / Management desktop it often sits beside **Today’s Hit List**.

Pinned tasks and journal/reminder summaries are **server-backed** and sync across devices after login.

Full **My Day** behaviour: [Zenith → My Day](/help/zenith#my-day-personal-productivity-drawer).

---

## Things needing attention (Zenith)

**Who sees it:** **Sales**, **Admin**, and **Management** for **Needs review** (dates, payments, capacity, or time in stage). **Sales**, **Operations**, and **Admin** also see **panel / inverter brand** gaps. **Finance** does **not** see this card.

**Visual cue:** When the card has items, it keeps a stronger gold (or red, if any overdue-commissioning) border wash and a **Needs a look** badge. The **first time each day** you open Zenith with items present, the card also pulses briefly and may scroll into view if it was below the fold — then it stays calmly highlighted so it is not missed on login without nagging every glance.

**When it appears:** At least one of:

- A **Needs review** Data Sense flag in your **FY / Quarter / Month** explorer slice (dates, payments, capacity, or time-in-stage vs Deal Health SLAs). Incomplete **Lost** records are **not** listed here. **Management** and **Admin** also see a **by salesperson** count that opens Projects for that person.
- A late-stage project missing **panel brand**, **inverter brand**, or **both** in **Project Lifecycle** (**Sales / Ops / Admin**).

### What each row shows

- **#SL No. Customer name** — link to **Project detail**.
- **Badge** — Data Sense reason (e.g. overdue commissioning) or **Missing: Panel brand / Inverter / both**.
- **+ My Day** — Pins a follow-up. Then **✓ My Day**; no duplicate open task per project.
- **Open →** — Project detail.

Count chips (when Data Sense applies) **filter this card in place** — e.g. **Overdue commissioning** shows only those rows. Click the same chip again (or **Clear filter**) to show all. Chips do **not** leave Zenith. Flag meanings: [Needs review (Data Sense)](/help/modules#needs-review-data-sense).

Up to **three** rows show; if more qualify, **+N more — view all** opens **Projects** (with the active chip filter applied when one is selected).

### Header actions

**Projects →** / **view all** open **Projects** with **Needs review** (or the selected rule) when Data Sense rows exist; otherwise the late-stage **lifecycle specs incomplete** filter. Same **FY / Quarter / Month** as Zenith.

### My Day integration

Completing a project-pinned task can optionally log **`[My Day ✓] …`** to **Project remarks** ([Zenith → My Day](/help/zenith#my-day-personal-productivity-drawer)). Suggested from CRM also includes **Needs review** (overdue commissioning, missing confirmation, reversed dates, payment mismatches) for Sales, Management, and Admin.

### Briefing parity

**Sales**, **Admin**, and **Management** may see a **Needs review** line in the **Smart daily briefing**. **Sales**, **Admin**, and **Operations** may also see the **panel/inverter brand** reminder. See [Zenith → Daily briefing](/help/zenith#daily-briefing-zenith).
