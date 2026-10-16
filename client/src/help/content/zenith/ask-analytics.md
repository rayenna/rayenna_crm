# Ask Zenith (natural language)

**Sales**, **Management**, **Admin**, **Operations**, and **Finance** can ask analytics questions near the top of Zenith (under Solar News). Zenith maps the question to a known metric, computes numbers from the same CRM data as the rest of Zenith, and shows **one insight** plus **one chart or table**.

## How to use Ask

1. Set **FY / Quarter / Month** on the command bar, **or** say a relative period in the question (**last FY**, **this quarter**, **this month**, **FY 2024-25**). The answer eyebrow shows which filters were used. Example chips use your current filters unless the question itself names a period.
2. Type a question in **Ask Zenith…**, or tap **Dictate** (Chrome / Edge / Safari; allow mic permission), then press **Ask**. Dictation fills the box — it does not submit by itself.
3. Read the insight and the chart/table. Use **Follow up** or **More questions** chips to refine without starting over.
4. **Recent asks** are remembered for your login in this browser (up to 12). They are not synced across devices.
5. When available, use **Open in Projects →** (or **Lost Deals**) for the matching cohort.

Ask is disabled while **Offline**. It needs the CRM API and **Anthropic** credentials on the server: `ANTHROPIC_API_KEY`, and often `ANTHROPIC_WORKSPACE_ID` when the key is not scoped to one workspace.

## What you can ask (examples)

- Which lead sources drove the most revenue?
- Revenue by salesperson
- Show my pipeline by stage
- How many projects used Adani panels? / revenue with Deye inverters / SBI loans
- Which panel brands sold most? / Which banks are financing loans? *(Management / Admin / Finance)*
- Payment status breakdown / outstanding balance / availing loan *(Finance + executive)*
- Installation status / pending subsidy *(Operations + executive; Sales own-book install status)*
- Top customers by profit
- Summarise lost deals by reason *(Management / Admin company-wide; Sales own book)*
- Proposal Engine bucket counts *(Sales / Management / Admin)*

If the question is outside this catalog, Zenith asks you to clarify and suggests example questions.

## Trust and scope

- Numbers are **server-computed** from project data — the language model only chooses *which* metric to run, not the figures.
- **Sales** answers stay scoped to your own book (same as Zenith Sales KPIs).
- Other roles see company-wide metrics allowed for their pack under the current filters.
- Classic **AI Insights** ticker and **Daily briefing** stay rule-based and separate from Ask.
