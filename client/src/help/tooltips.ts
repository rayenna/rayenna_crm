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
  }
}

/**
 * Get help tooltip by key
 * @param key - Help tooltip key
 * @returns HelpTooltip or null
 */
export const getHelpTooltip = (key: string): HelpTooltip | null => {
  return helpTooltips[key] || null
}
