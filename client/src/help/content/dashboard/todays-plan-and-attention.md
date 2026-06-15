# Today's plan and Things needing attention

Two cards appear below the scrolling marquee on the classic Dashboard (layout varies by role and screen width).

## Today's plan (Dashboard)

The **Today's plan** card (sun icon) shows:

- **Summary** — Short lines from your **My Day** snapshot (open tasks, reminders, whether you started today’s journal).
- **Suggested from CRM** — Follow-ups from pipeline logic (Hit List–style deals, payment overdue, delayed installs, **lifecycle brand gaps** where your role receives them). One-tap **+ My Day** per suggestion. After pinning, the row stays visible and the button shows **✓ My Day** (teal); clicking again does **not** create a duplicate (**one open task per project**). **Scroll** inside the card for more suggestions.
- **Tasks** / **Open My Day** — Opens the ☀ drawer on the **Tasks** tab (pinned and manual tasks only — not a duplicate CRM list).

**Who sees it:** **All roles** (full width when alone).

**Layout with Things needing attention:** On **Sales**, **Operations**, and **Admin**, when late-stage projects are missing panel/inverter brands, **Today's plan** sits **beside** **Things Needing Attention** on **laptop / wide screens** (two equal columns). On **phone and narrow tablets** the cards **stack** — plan first, then attention. **Finance** and **Management** see **Today's plan** only (no attention card).

Pinned tasks and journal/reminder summaries are **server-backed** and sync across devices after login.

Full **My Day** behaviour: [Zenith → My Day](/help/zenith#my-day-personal-productivity-drawer).

---

## Things needing attention (Dashboard)

**Who sees it:** **Sales**, **Operations**, and **Admin** on the classic Dashboard. **Management** and **Finance** do **not** see this card.

**When it appears:** At least one project in **Under Installation**, **Completed**, or **Completed – Subsidy Credited** is missing **panel brand**, **inverter brand**, or **both** in **Project Lifecycle**, within your dashboard **FY / Quarter / Month** scope.

**Where it sits:** Next to **Today's plan** on wide screens. Card title: **Things Needing Attention**.

### What each row shows

- **#SL No. Customer name** — link to **Project detail**.
- **Missing badge** — **Panel brand**, **Inverter brand**, or **Panel & inverter** (gold badge).
- **+ My Day** — Pins a follow-up (e.g. “Enter panel brand — …”). Then **✓ My Day**; no duplicate open task per project.
- **Open →** — Project detail.

Up to **three** rows show; if more qualify, **+N more — view all** at the bottom.

### Header actions

**Projects →** (top right) opens **Projects** with:

- **Status** = Under Installation, Completed, Completed – Subsidy Credited  
- **Lifecycle specs incomplete** (missing panel and/or inverter brand)  
- Same **FY / Quarter / Month** as the Dashboard  

### My Day integration

Completing a project-pinned task can optionally log **`[My Day ✓] …`** to **Project remarks** ([Zenith → My Day](/help/zenith#my-day-personal-productivity-drawer)).

### Zenith parity

**Sales**, **Admin**, and **Operations** may see a matching **briefing reminder line** in Zenith’s **Smart daily briefing** (count + names). **Management** and **Finance** do **not** see that lifecycle line in the briefing. See [Zenith → Daily briefing](/help/zenith#daily-briefing-zenith).
