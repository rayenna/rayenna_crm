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
      'Full-screen analytics with the same FY, Quarter, and Month rules as the Dashboard: AI Insights, The Board leaderboard, collapsible Your Focus, KPIs, Revenue forecast, Deal flow funnel (click stages or payment pills), Proposal Engine under Your Focus, clickable Explore charts, and Quick Actions lists. List mode includes Open in Projects → for the full Projects page with matching filters. Open Help → Analytics for the full guide.',
  },
  'zenith.hit-list': {
    key: 'zenith.hit-list',
    title: 'Today’s Hit List',
    content:
      'Up to seven deals that need attention today, from the same pipeline data as Your pipeline today. Table columns: customer, stage, sales person, deal value, last activity (N days ago), Alert (why it’s listed), confirmation date, Deal Health, Open →. Open → opens Quick Actions for that project. On small screens, the same facts appear as stacked cards. For sort and filters, use Your pipeline today under Your Focus.',
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
      'Opens the Quick Actions drawer with projects matching that chart slice and your Zenith filters. FY profit lists use gross profit totals; most other slices use order value. Open in Projects → applies the same logical filters on the Projects page. The Board uses the same drawer for period / salesperson drill-down.',
  },
  'zenith.deal-flow-funnel': {
    key: 'zenith.deal-flow-funnel',
    title: 'Deal flow funnel (Zenith)',
    content:
      'Click a stage row or payment status pill to open Quick Actions in list mode with the same cohort as the funnel tile for your FY / Quarter / Month. Open in Projects → opens Projects with matching stage or payment filters.',
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
