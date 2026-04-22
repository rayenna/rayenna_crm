// Help tooltips index - short help text for tooltips
export interface HelpTooltip {
  key: string
  title: string
  content: string
}

export const helpTooltips: Record<string, HelpTooltip> = {
  // Dashboard tiles
  'dashboard.total-leads': {
    key: 'dashboard.total-leads',
    title: 'Total Leads',
    content: 'Total number of potential customers or leads in the system.'
  },
  'dashboard.total-capacity': {
    key: 'dashboard.total-capacity',
    title: 'Total Capacity',
    content: 'Combined system capacity in kilowatts (kW) across all projects.'
  },
  'dashboard.total-revenue': {
    key: 'dashboard.total-revenue',
    title: 'Total Revenue',
    content: 'Total revenue generated from all projects in the selected period.'
  },
  'dashboard.total-pipeline': {
    key: 'dashboard.total-pipeline',
    title: 'Total Pipeline',
    content: 'Total value of projects in the sales pipeline (not yet confirmed).'
  },
  'dashboard.approved-projects': {
    key: 'dashboard.approved-projects',
    title: 'Approved Projects',
    content: 'Number of projects that have been approved and confirmed.'
  },
  'dashboard.pending-installation': {
    key: 'dashboard.pending-installation',
    title: 'Pending Installation',
    content: 'Number of projects waiting for installation to begin.'
  },
  'dashboard.submitted-for-subsidy': {
    key: 'dashboard.submitted-for-subsidy',
    title: 'Submitted for Subsidy',
    content: 'Number of projects that have been submitted for government subsidy.'
  },
  'dashboard.subsidy-credited': {
    key: 'dashboard.subsidy-credited',
    title: 'Subsidy Credited',
    content: 'Number of projects where subsidy has been credited to the customer.'
  },
  'dashboard.amount-received': {
    key: 'dashboard.amount-received',
    title: 'Amount Received',
    content: 'Total amount of money received from customers for projects.'
  },
  'dashboard.outstanding-balance': {
    key: 'dashboard.outstanding-balance',
    title: 'Outstanding Balance',
    content: 'Total amount still pending from customers for completed or ongoing projects.'
  },

  // Support Tickets
  'support-tickets.open': {
    key: 'support-tickets.open',
    title: 'Open Tickets',
    content: 'Support tickets that are newly created and awaiting initial response.'
  },
  'support-tickets.in-progress': {
    key: 'support-tickets.in-progress',
    title: 'In Progress Tickets',
    content: 'Support tickets that are currently being worked on with active follow-ups.'
  },
  'support-tickets.closed': {
    key: 'support-tickets.closed',
    title: 'Closed Tickets',
    content: 'Support tickets that have been resolved and closed.'
  },
  'support-tickets.overdue': {
    key: 'support-tickets.overdue',
    title: 'Overdue Tickets',
    content: 'Open or in-progress tickets with follow-up dates that have passed.'
  },
  'support-tickets.ticket-number': {
    key: 'support-tickets.ticket-number',
    title: 'Ticket Number',
    content: 'Unique identifier for the support ticket (format: RE########).'
  },
  'support-tickets.follow-up': {
    key: 'support-tickets.follow-up',
    title: 'Follow-up',
    content: 'Activity log entry documenting progress or communication about the ticket.'
  },

  // Financial metrics
  'finance.revenue': {
    key: 'finance.revenue',
    title: 'Revenue',
    content: 'Total income generated from all projects and services.'
  },
  'finance.profitability': {
    key: 'finance.profitability',
    title: 'Profitability',
    content: 'Percentage of profit margin calculated as (Profit / Revenue) × 100.'
  },
  'finance.gross-profit': {
    key: 'finance.gross-profit',
    title: 'Gross Profit',
    content: 'Total revenue minus direct costs (materials, labor, etc.).'
  },
  'finance.expected-profit': {
    key: 'finance.expected-profit',
    title: 'Expected Profit',
    content: 'Projected profit based on estimated costs and revenue.'
  },
  'finance.payment-status': {
    key: 'finance.payment-status',
    title: 'Payment Status',
    content: 'Current status of payments: Pending, Partial, or Fully Paid.'
  },
  'finance.tally-export': {
    key: 'finance.tally-export',
    title: 'Tally Export',
    content: 'Export financial data in Tally-compatible format for accounting software.'
  },

  // Project metrics
  'project.status': {
    key: 'project.status',
    title: 'Project Status',
    content: 'Current stage of the project in its lifecycle (Lead, Confirmed, Installation, Completed, etc.).'
  },
  'project.system-capacity': {
    key: 'project.system-capacity',
    title: 'System Capacity',
    content: 'Total power generation capacity of the solar system in kilowatts (kW).'
  },
  'project.order-value': {
    key: 'project.order-value',
    title: 'Order Value',
    content: 'Total value of the project order including all components and services.'
  },
  'project.confirmation-date': {
    key: 'project.confirmation-date',
    title: 'Confirmation Date',
    content: 'Date when the project was confirmed and order was placed.'
  },

  // Zenith Command Center (see Help → Analytics → Zenith Command Center)
  'zenith.command-center': {
    key: 'zenith.command-center',
    title: 'Zenith Command Center',
    content:
      'Full-screen analytics with the same FY, Quarter, and Month rules as the Dashboard: Solar News (RSS industry headlines above AI Insights), AI Insights from your loaded CRM data, The Board leaderboard, collapsible Your Focus, KPIs (including clickable Availing Loan on Finance and executive Zenith), Revenue forecast, Deal flow funnel (click stages or payment pills), Proposal Engine under Your Focus, clickable Explore charts, Payment radar (Top overdue, Latest payments received, shared payment-status legend), and Quick Actions lists. Drawer list rows and single-project headers show Sales (assigned salesperson). Single-project Quick Actions and Operations drawers show Recent remarks (read-only) above Log activity and a Payment snapshot (status, total received, balance) after Deal value when payment applies — N/A when not applicable. Finance drawer from Payment radar already includes payment context. List mode includes Open in Projects → for the full Projects page with matching filters. Open Help → Analytics for the full guide.',
  },
  'zenith.hit-list': {
    key: 'zenith.hit-list',
    title: 'Today’s Hit List',
    content:
      'Up to seven prioritised deals from the same pipeline data as Your pipeline today. Filter customer, stage, and salesperson; click column headers to sort (including Alert, Confirmation, Health). Columns: Sl No. / Prj # (project serial), customer, stage, sales person, deal value, last activity, Alert, confirmation date, Deal Health, Open →. Open → opens Quick Actions (Sales + name in header; Recent remarks above Log activity). On tablet/desktop, a hint may remind you to scroll the table and use Open →; hidden on small phones. Stacked cards on narrow screens.',
  },
  'zenith.quick-drawer-remarks': {
    key: 'zenith.quick-drawer-remarks',
    title: 'Recent remarks (Zenith)',
    content:
      'Shows the latest project remarks (same data as Project → Remarks) before you log new activity. Newest first; read-only here. Open full project for the complete history and to edit or delete remarks. Available in Quick Actions, Operations, and Finance Zenith drawers.',
  },
  'zenith.quick-drawer-payment': {
    key: 'zenith.quick-drawer-payment',
    title: 'Payment snapshot (Zenith)',
    content:
      'After Deal value, Quick Actions (Sales / Management / Admin) and the Operations drawer show Payment status, Total amount received, and Balance pending — read-only context aligned with Project detail. N/A when there is no positive order value or the project is in an early or Lost stage. Payment radar opens the Finance drawer, which already has its own payment block.',
  },
  'zenith.the-board': {
    key: 'zenith.the-board',
    title: 'The Board',
    content:
      'Sales leaderboard by Month, Quarter (Indian FY quarters), or FY. Rankings use winning-stage deals credited by stage entered / confirmation dates. Click header totals or a row’s value to open the same Quick Actions list drawer as chart drill-down. Use Open in Projects → for the full Projects list with matching filters.',
  },
  'zenith.victory-toast': {
    key: 'zenith.victory-toast',
    title: 'Victory toast',
    content:
      'Short celebration when a project moves into Confirmed, Under Installation, Completed, or Subsidy Credited — from Quick Actions, project save, etc. Auto-dismisses; use × to close.',
  },
  'zenith.revenue-forecast': {
    key: 'zenith.revenue-forecast',
    title: 'Revenue forecast (Zenith)',
    content:
      'Weighted pipeline forecast: each open deal adds order value × stage win probability (not 100% for early stages). Tabs split the same total by Source, Sales, Segment, or Stage. +N more opens all open deals in the drawer.',
  },
  'zenith.revenue-profit-fy-chart': {
    key: 'zenith.revenue-profit-fy-chart',
    title: 'Revenue & profit by FY (Zenith)',
    content:
      'Orange point = revenue drill-down (list totals = order value). Teal bar = profit drill-down (list totals = gross profit). Chart years match your FY filter. Tooltip shows each metric once.',
  },
  'zenith.customer-profitability': {
    key: 'zenith.customer-profitability',
    title: 'Customer projects profitability',
    content:
      'Top projects by recorded profitability (Sales & Commercial): Word Cloud size = relative profit; Top 10 = same data ranked. Each label is one project; filters match Zenith dates.',
  },
  'zenith.chart-drill-down': {
    key: 'zenith.chart-drill-down',
    title: 'Click to explore',
    content:
      'Opens the Quick Actions drawer with projects matching that chart slice and your Zenith filters. Each row shows Sales (assigned salesperson) under the customer name. FY profit lists use gross profit totals; most other slices use order value. Open in Projects → applies the same logical filters on the Projects page. The Board uses the same drawer for period / salesperson drill-down.',
  },
  'zenith.deal-flow-funnel': {
    key: 'zenith.deal-flow-funnel',
    title: 'Deal flow funnel (Zenith)',
    content:
      'Click a stage row or payment status pill to open Quick Actions in list mode with the same cohort as the funnel tile for your FY / Quarter / Month. Open in Projects → opens Projects with matching stage or payment filters.',
  },
  'zenith.kpi-availing-loan': {
    key: 'zenith.kpi-availing-loan',
    title: 'Availing Loan (Zenith KPI)',
    content:
      'Opens Quick Actions in list mode for projects availing loan (excluding Lost), scoped to your Zenith dates — same pattern as Explore charts and the Deal flow funnel. Open in Projects → opens the full Projects list with the Availing Loan filter. Shown on Finance Zenith and executive Zenith (Sales, Management, Admin); not on Operations Zenith KPI row.',
  },
  'zenith.payment-radar-top-overdue': {
    key: 'zenith.payment-radar-top-overdue',
    title: 'Top overdue (Payment radar)',
    content:
      'Sl No. / Prj # matches Projects. Click the project name to open the Finance quick drawer on Finance and Management/Admin Zenith (payment context); otherwise opens Project detail. Use Remind for WhatsApp or Email helpers. Filter by salesperson and customer text; payment ageing buckets above filter this table. Latest payments received (beside this table on wide layouts) lists recent receipts with the same name colours; see the shared legend below for Pending / Partial / Fully paid.',
  },
  'zenith.solar-news': {
    key: 'zenith.solar-news',
    title: 'Solar News ticker',
    content:
      'Industry headlines from RSS feeds aggregated on the server (~30 min cache, /api/solar-news). Click a headline to open the article in a new tab. Hover the strip on desktop to pause scrolling. Not CRM data — use AI Insights below for numbers from your filters.',
  },
  'zenith.proposal-engine-focus': {
    key: 'zenith.proposal-engine-focus',
    title: 'Proposal Engine (Zenith Your Focus)',
    content:
      'PE Ready, PE Draft, PE Not Yet Created, and Rest — same definitions as the Dashboard Proposal Engine card. In Zenith, click a row for the Quick Actions list, then Open in Projects → for the full Projects list with that PE bucket and your date filters.',
  },
}

/**
 * Get help tooltip by key
 * @param key - Help tooltip key
 * @returns HelpTooltip or null
 */
export const getHelpTooltip = (key: string): HelpTooltip | null => {
  return helpTooltips[key] || null
}
