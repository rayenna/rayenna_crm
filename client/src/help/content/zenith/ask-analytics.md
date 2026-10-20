# Ask Zenith (natural language)

**Sales**, **Management**, **Admin**, **Operations**, and **Finance** can use **Ask Zenith** on Zenith for two kinds of requests. On **desktop**, Ask sits in the **command bar**. On **phone / narrow** layouts, open the **Ask** tab in the bottom nav (or the floating **Ask** button on Today).

1. **Analytics** — maps the question to a known metric, computes numbers from the same CRM data as the rest of Zenith, and shows **one insight** plus **one chart or table**.
2. **Tasks** — phrases like **New Customer**, **Open My Day**, **Open Pending Subsidy Projects**, or **find customer Ramesh** navigate to the matching CRM screen. **List pending subsidy projects** stays in Ask as a table. The same task set is in the global **command palette** (**Ctrl+K** / **⌘K**) from any page — see [Command palette](/help/getting-started#command-palette-anywhere).

## How to use Ask

1. Set **FY / Quarter / Month** on the command bar, **or** say a relative period in the question (**last FY**, **this / last / next quarter**, **this / last / next half year** — H1 = Q1+Q2, H2 = Q3+Q4 — **this month**, **FY 2024-25**). You can also ask **year-on-year (YoY)** or **quarter-on-quarter (QoQ)** growth / comparison for **revenue**, **gross profit**, or **average margin** — Ask compares both periods in one table. The answer eyebrow shows which filters were used. Example chips use your current filters unless the question itself names a period. (Date filters apply to **analytics** answers, not task shortcuts.)
2. Focus the Ask box with **/** or **A** (when you are not already typing in a field), or open **Ask Zenith…** from the command palette (**Ctrl+K** / **⌘K**). Type a question or task, or tap **Dictate** (Chrome / Edge / Safari; allow mic permission), then press **Ask**. Dictation fills the box — it does not submit by itself. From the palette you can also type a question and choose **Ask Zenith: “…”** to jump here and run it.
3. For analytics: read the insight and the chart/table. Click a **chart bar/slice** or **table row** when links are shown to open the matching **Projects** (or Support Tickets) list. Use **Follow up** or **More questions** chips to refine without starting over.
4. For tasks: Zenith navigates you to the form or list (e.g. new customer, create ticket, customers/projects search, filtered queues).
5. **Recent asks** (analytics) are saved for your login on the server (up to 12) so they follow you across devices after login. A local cache keeps them available if the network blips. Close the answer with **×**; history stays for your next ask.
6. When available, use **Open in Projects →** or **Open Support Tickets →** for the matching cohort.

Ask is **disabled while Offline** (typed questions, Dictate, and example chips). Saved Zenith dashboard charts may still show from cache — wait for **Live** in the command bar before asking. Free-text analytics also needs **Anthropic** credentials on the server: `ANTHROPIC_API_KEY`, and often `ANTHROPIC_WORKSPACE_ID` when the key is not scoped to one workspace. Exact example chips and some entity matches can still run when Claude is unavailable.

## Analytics you can ask

Role packs differ — example chips under the Ask box show questions allowed for **your** role. Outside the catalog, Zenith asks you to clarify.

### Who to call and stalled deals

- **Who should I call today?** — Hit List (overdue / stalled / going cold) plus outstanding payment chase, with a reason for each name
- **Why is my pipeline stalling?** — Deal Health list of quiet / over-SLA deals

### Pipeline, revenue, and equipment

- Which lead sources drove the most revenue? · Revenue by salesperson · Show my pipeline by stage
- How many projects used Adani panels? / revenue with Deye inverters / SBI loans
- Which panel brands sold most? · Which inverter brands sold most? · Which banks are financing loans? *(Management / Admin / Finance)*
- Top customers by profit · Proposal Engine bucket counts · Capacity sold

### Segment mixes and capacity

- Subsidy vs Non-Subsidy revenue · **Subsidy vs Non-Subsidy profitability**
- **DCR vs Non-DCR profitability** · **Compare bank profitability** · **City profitability** · **Salesperson profitability** (works with **this / last half year** or FY on the question / date bar)
- DCR vs Non-DCR mix (order value)
- Revenue by customer type (Residential / Apartment / Commercial)
- Service type mix (EPC, cleaning, maintenance…) · Roof type · System type (on-grid / off-grid / hybrid)
- Capacity sold by size band (under 3 / 3–5 / 6–10 / above 10 kW)
- **Revenue by city** · **Loan vs cash revenue**

### Project & customer records

- **Status of SL 123** / **status of Ramesh** — one project card (payments, KSEB/MNRE dates, commissioning, site address, remarks, PE/hub, docs)
- **Customer details for {name}** — customer record (contact, city, GST, linked projects). Example chips use a name from **your** book. If nobody matches, Ask suggests a nearby name instead of an empty table.
- **List customers in Kochi** / residential / for salesperson X — customer lists
- Pair detail lists with **for salesperson X** or **for ops Y** (e.g. payment timeline for salesperson Anoop)

### Payment, compliance, documents

- **Payment timeline** · **projects with advance only** · **projects with no P2**
- **No feasibility** · **no registration** · **subsidy request sent not credited** (lists with dates)
- **Overdue commissioning** (pair with this quarter / FY on the date bar) · site address / city on list rows
- **Confirmed projects with no documents** · missing KSEB / MNRE / agreement docs
- **Projects mentioning …** · **last remark on SL 123**
- **PE missing BOM / ROI / costing / proposal** · **Hub station IDs** / **Hub unlinked projects**
- **Ravi's under-installation unpaid** — salesperson (or ops) name + status + payment filters
- **550W panels** / inverter kW · **incentive eligible** · **lost deal details**

### Edit from Ask (opens the form — does not save for you)

- **Update payment for SL 123** · **Change status of SL 123** · **Assign ops to SL 123** · **Add remark to SL 123** · **Edit customer Ramesh**

### Operations and compliance

- Ops workload (by assigned ops) · Project stage mix · SLA status indicators (GREEN / AMBER / RED)
- Compliance backlog (KSEB feasibility/registration, install, MNRE portal, subsidy credit)
- Subsidy funnel · Installation status / installation records · AMCs expiring
- Hub plant link status (Solis / Deye / Sunways station ids)
- Projects pending subsidy credit

### Finance and collections

- Profit summary (order value, expected / gross / final profit, margin, collected, outstanding, kW)
- **YoY / this FY vs last FY** — revenue growth, gross profit, or average margin comparison
- **QoQ / this quarter vs last quarter** — same metrics, quarter-on-quarter growth
- **Profit / revenue this · last · next quarter** — profit summary for that Indian FY quarter
- Payment status breakdown · Outstanding balance · Outstanding by salesperson
- Payment mode mix (UPI / Bank / Cheque) · Unpaid invoices · Which projects are availing loan?

### Support tickets

- **Who has the oldest open ticket?** · **Show open support tickets** · **Show overdue support tickets** — a queue (age, owner, SLA), not only a pie. Empty books say so and offer **Create a Support Ticket**.
- **Create a ticket for SL 141 inverter fault** — opens the ticket form with that project and title filled in.
- Totals pie: **Show me the total support tickets raised**. *(Sales own book; Ops / Management / Admin company-wide — **not Finance**)*
- Support tickets by salesperson · Ticket resolution time (avg / median days to close)

### Act on an answer

Call-list, stalled-deal, PE-missing, and ticket rows can **Call**, **WhatsApp**, **Add to My Day**, **Remark**, **Proposal** (opens Proposal Engine for that CRM project), or **Ticket** without leaving Ask. Confirm remark/ticket in the drawer.

### Ask everywhere

The header **Ask** button and command palette (**Ask Zenith: “…”**) open the same copilot on Customers, Projects, Support Tickets, and other CRM pages. On Zenith itself, Ask stays in the command bar / Ask tab.

Quota: **60 asks / 10 minutes** per person. The composer shows how many are left.

### Lost deals

- Summarise lost deals by reason · Lost to competition reasons (price, features, timeline, brand, relationship)

### Filters you can say in a question

City · project stage · SLA colour · salesperson name *(Mgmt/Admin)* · unassigned salesperson · missing lead source · incentive eligible · incomplete specs · Hub linked/unlinked · capacity bands / panel watts · subsidy / DCR / residential / EPC / metal roof / hybrid, and similar CRM dimensions.

## Tasks from Ask (same as command palette)

Say the action in plain language; Ask navigates when your role allows. Full palette list: [Keyboard shortcuts → Command palette](/help/getting-started#command-palette-anywhere).

| Group | Examples |
| :-- | :-- |
| **Create** | New Customer · New Project · Create Support Ticket · New User |
| **Personal** | Open My Day · Open My Day Journal · Show Tip of the Day |
| **Lists / queues** | Overdue / open / Hub support tickets · Proposal / Confirmed / Under Installation · Under installation not fully paid (pending + partial) · Pending Subsidy · Availing Loan · Projects Needing Review · PE Not Started / Draft / Ready |
| **Go to** | Zenith · Customers · Projects · Support Tickets · Dashboard · Solar Hub (+ provisioning / unlinked / maintenance) · Lost Deals · Tally Export · Users · Audit · Change Password · Help |
| **Search** | Customer Search · find customer *name* · Project Search · find project *text* |

## Trust and scope

- Numbers are **server-computed** from project data — the language model only chooses *which* metric to run, not the figures.
- **Sales** analytics stay scoped to your own book (same as Zenith Sales KPIs).
- Other roles see company-wide metrics allowed for their pack under the current filters.
- Classic **AI Insights** ticker and **Daily briefing** stay rule-based and separate from Ask.
- Prefer **Ctrl+K** / **⌘K** for jumps and create. For analytics on any CRM page, use header **Ask** or **Ask Zenith: “…”** in the palette.
