# Ask Zenith (natural language)

**Sales**, **Management**, **Admin**, **Operations**, and **Finance** can use **Ask Zenith** near the top of Zenith (under **Solar News**) for two kinds of requests:

1. **Analytics** — maps the question to a known metric, computes numbers from the same CRM data as the rest of Zenith, and shows **one insight** plus **one chart or table**.
2. **Tasks** — phrases like **New Customer**, **Open My Day**, **Pending Subsidy**, or **find customer Ramesh** navigate to the matching CRM screen. The same task set is in the global **command palette** (**Ctrl+K** / **⌘K**) from any page — see [Command palette](/help/getting-started#command-palette-anywhere).

## How to use Ask

1. Set **FY / Quarter / Month** on the command bar, **or** say a relative period in the question (**last FY**, **this quarter**, **this month**, **FY 2024-25**). The answer eyebrow shows which filters were used. Example chips use your current filters unless the question itself names a period. (Date filters apply to **analytics** answers, not task shortcuts.)
2. Type a question or task in **Ask Zenith…**, or tap **Dictate** (Chrome / Edge / Safari; allow mic permission), then press **Ask**. Dictation fills the box — it does not submit by itself.
3. For analytics: read the insight and the chart/table. Use **Follow up** or **More questions** chips to refine without starting over.
4. For tasks: Zenith navigates you to the form or list (e.g. new customer, create ticket, customers/projects search, filtered queues).
5. **Recent asks** (analytics) are remembered for your login in this browser (up to 12). They are not synced across devices.
6. When available, use **Open in Projects →** or **Open Support Tickets →** for the matching cohort.

Ask is disabled while **Offline**. It needs the CRM API and **Anthropic** credentials on the server: `ANTHROPIC_API_KEY`, and often `ANTHROPIC_WORKSPACE_ID` when the key is not scoped to one workspace.

## Analytics you can ask

Role packs differ — example chips under the Ask box show questions allowed for **your** role. Outside the catalog, Zenith asks you to clarify.

### Pipeline, revenue, and equipment

- Which lead sources drove the most revenue? · Revenue by salesperson · Show my pipeline by stage
- How many projects used Adani panels? / revenue with Deye inverters / SBI loans
- Which panel brands sold most? · Which inverter brands sold most? · Which banks are financing loans? *(Management / Admin / Finance)*
- Top customers by profit · Proposal Engine bucket counts · Capacity sold

### Segment mixes and capacity

- Subsidy vs Non-Subsidy revenue · DCR vs Non-DCR mix
- Revenue by customer type (Residential / Apartment / Commercial)
- Service type mix (EPC, cleaning, maintenance…) · Roof type · System type (on-grid / off-grid / hybrid)
- Capacity sold by size band (under 3 / 3–5 / 6–10 / above 10 kW)
- **Revenue by city** · **Loan vs cash revenue**

### Operations and compliance

- Ops workload (by assigned ops) · Project stage mix · SLA status indicators (GREEN / AMBER / RED)
- Compliance backlog (KSEB feasibility/registration, install, MNRE portal, subsidy credit)
- Subsidy funnel · Installation status / installation records · AMCs expiring
- Hub plant link status (Solis / Deye / Sunways station ids)
- Projects pending subsidy credit

### Finance and collections

- Profit summary (order value, gross profit, margin, collected, outstanding, kW)
- Payment status breakdown · Outstanding balance · Outstanding by salesperson
- Payment mode mix (UPI / Bank / Cheque) · Unpaid invoices · Which projects are availing loan?

### Support tickets

- Show me the total support tickets raised / open / overdue *(Sales own book; Ops / Management / Admin company-wide — **not Finance**)*
- Support tickets by salesperson · Ticket resolution time (avg / median days to close)

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
| **Lists / queues** | Overdue / open / Hub support tickets · Proposal / Confirmed / Under Installation · Pending Subsidy · Availing Loan · Projects Needing Review · PE Not Started / Draft / Ready |
| **Go to** | Zenith · Customers · Projects · Support Tickets · Dashboard · Solar Hub (+ provisioning / unlinked / maintenance) · Lost Deals · Tally Export · Users · Audit · Change Password · Help |
| **Search** | Customer Search · find customer *name* · Project Search · find project *text* |

## Trust and scope

- Numbers are **server-computed** from project data — the language model only chooses *which* metric to run, not the figures.
- **Sales** analytics stay scoped to your own book (same as Zenith Sales KPIs).
- Other roles see company-wide metrics allowed for their pack under the current filters.
- Classic **AI Insights** ticker and **Daily briefing** stay rule-based and separate from Ask.
- Prefer **Ctrl+K** / **⌘K** when you are not on Zenith and only need a jump or create action.
