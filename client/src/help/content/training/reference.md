# Training reference

For **app-wide** questions (login, modules, Proposal Engine, troubleshooting), see [FAQ](/help/faq).

## Training FAQ (session)

**Q: Zenith vs Dashboard — which is correct?**  
A: Same rules and data; different **layout**. Check **filters** and **scope** (Sales = yours on executive Zenith).

**Q: I clicked a chart on the Dashboard and landed on Projects — is that new?**  
A: Yes — classic **Dashboard** charts are **clickable** and open **Projects** with the same slice logic as **Zenith** for matching charts. Dashboard = **direct** navigation; Zenith = **Quick Actions** drawer first, then **Open in Projects →**. See Help → **Dashboard** → [Classic Dashboard chart click-through](/help/dashboard#classic-dashboard-chart-click-through-to-projects).

**Q: Forecast dropped when a deal moved Proposal → Lead?**  
A: **Lower stage weight** in the weighted total.

**Q: Edit payments from Zenith?**  
A: Use **Project detail** / Finance areas.

**Q: Management cannot edit in drawer — bug?**  
A: **Intentional view-only.**

**Q: Stale data?**  
A: Refresh; Zenith is **server-backed** after login.

**Q: Drawer count vs Open in Projects?**  
A: Drawer uses Zenith **explorer batch**; **Open in Projects** uses full list API — see [Zenith → Explorer batch limit](/help/zenith#explorer-batch-limit-zenith).

**Q: Zenith PE vs Dashboard PE card?**  
A: Same buckets. Zenith → **drawer first**; Dashboard card → **direct Projects link**.

**Q: Zenith Availing Loan vs Dashboard Quick Access Availing Loan?**  
A: Same filter semantics, different **first step**. On **Finance** and **executive** Zenith (**Sales**, **Management**, **Admin**), **Availing Loan** opens **Quick Actions** (like chart drill-down); use **Open in Projects →** for the full grid. The classic **Dashboard** **Availing Loan** metric tile still links **straight to Projects** with the filter.

**Q: Hit List looks different from “before” — what changed?**  
A: It uses the **same column pattern** as **Your pipeline today** (including **confirmation date** and **last activity** as *N*d ago), plus an **Alert** column, **filter** row (**customer / stage / salesperson**), and **sortable** headers. **Open →** still goes to **Quick Actions**, which shows **Sales** next to the project name and **Recent remarks** above **Log activity** for context. The **scroll / Open →** hint under the Hit List title appears from **tablet/desktop** widths up, not on the smallest phones.

**Q: Mobile: why dropdowns instead of chips?**  
A: **Space** — one thin filter row so charts and tables stay usable on small screens.

---

## Deal Health score (training summary)

**Deal Health** is a **0–100** score for **open** pipeline deals (not Completed, Subsidy Credited, or Lost). It is the **sum of five factors** (each has a max); total capped at **100**.

| Factor | Max | One-line meaning |
| :-- | --: | :-- |
| Activity | 30 | How recently the project was updated |
| Momentum | 25 | Time in current stage vs typical for that stage |
| Deal value | 20 | Order value **bands** — top band **₹2L–₹8L** sweet spot; mild discount above ₹8L |
| Commitment | 15 | **Booked:** confirmation + advance vs order. **Pre-order:** order value + expected commissioning |
| Lead source | 10 | Referral / partner sources score higher than unknown |

**Illustration:**

```text
Deal Health = Activity(≤30) + Momentum(≤25) + Deal value(≤20) + Commitment(≤15) + Source(≤10)  →  0–100
```

For **exact point tables** (activity days, momentum multiples, every rupee band, advance rules, lead source points), see [Modules → Deal Health](/help/modules#deal-health-score).

---

## Glossary

| Term | Meaning |
| :-- | :-- |
| **FY** | Financial year April–March (e.g. `2024-25`). |
| **Command bar** | Sticky top area: branding, date filters, Briefing, Live clock. |
| **Weighted forecast** | Σ (order value × stage win probability) for open deals. |
| **Deal Health** | 0–100: five factors (activity, momentum, deal value ₹2L–₹8L sweet spot, commitment, lead source). Full tables in Help → Projects. |
| **Drill-down** | Chart / Board / funnel / PE row / **Availing Loan** KPI → **Quick Actions** list. |
| **Quick Actions** | Side drawer: list mode or single-project quick edits; **Recent remarks** (read-only) above **Log activity** where applicable; **Payment** snapshot after **Deal value** on **Quick Actions** and **Operations** (not duplicated on **Payment radar → Finance** drawer). |
| **Open in Projects →** | Footer link → **Projects** with matching URL filters. |
| **PE bucket** | PE Ready, PE Draft, PE Not Yet Created, Rest. |
| **Explorer batch** | Large cap of project rows loaded for Zenith drill-downs (see **Zenith** help). |
| **Today’s Hit List** | Up to **seven** urgent pipeline deals; **filters + sort** like **Your pipeline today**; **Alert** column; **Open →** = **Quick Actions** (with **Recent remarks** above log activity). |
| **Won-path** (The Board) | Confirmed → Subsidy Credited stages counted for leaderboard credit rules. |

---

# Appendix — Keyboard shortcuts

| Shortcut | Action |
| :-- | :-- |
| `?` | Help (context-sensitive: Zenith or Dashboard) |
| `Ctrl+Shift+D` / `⌘⇧D` | **Dashboard** |
| `Ctrl+Shift+C` / `⌘⇧C` | **Customers** |
| `Ctrl+Shift+P` / `⌘⇧P` | **Projects** |
| `Ctrl+Shift+K` / `⌘⇧K` | **Support Tickets** |
| `Ctrl+Shift+Z` / `⌘⇧Z` | Open **Zenith** |
| `Ctrl+Shift+M` / `⌘⇧M` | **My Day** — Tasks, Journal & Reminders drawer (all roles) |
| `Ctrl+Shift+N` / `⌘⇧N` | **New customer** (Sales, Management, Admin) |
| `Ctrl+Shift+E` / `⌘⇧E` | **New project** (Admin, Sales) |
| `Esc` | From Help → **Dashboard** |

Full list: [Getting Started → Keyboard shortcuts](/help/getting-started#keyboard-shortcuts).

---

## Post-training check (3 questions)

1. Name **two** places you can open a **filtered project list** from Zenith (e.g. a chart slice, funnel row, **Availing Loan** KPI, or **The Board**).  
2. What is the difference between **orange** and **teal** on the **Revenue & profit by FY** chart (drawer totals)?  
3. Who gets **view-only** Quick Actions on projects?

---

## Document control

| Field | Value |
| :-- | :-- |
| **Product** | Rayenna CRM — Zenith Command Center |
| **Audience** | End-user training (Sales-primary); facilitators; slide authors |
| **Companion** | [Zenith command center](/help/zenith#zenith-command-center) · [Zenith playbooks](/help/zenith#role-playbooks-step-by-step) |
| **Version note** | Jun 2026 — aligned with split Help (Dashboard, Zenith + role playbooks, Modules, Security, FAQ). Training is facilitator script; deep reference in linked Help pages. |

---

*End of training guide*
