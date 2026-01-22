# HelpTooltip Component

A reusable help tooltip component that displays contextual help information.

## Usage

```tsx
import HelpTooltip from '../components/help/HelpTooltip'

// Basic usage
<HelpTooltip helpKey="dashboard.total-leads" />

// With custom position
<HelpTooltip helpKey="support-tickets.open" position="right" />

// In a metric card title
<div className="flex items-center gap-2">
  <span>Total Leads</span>
  <HelpTooltip helpKey="dashboard.total-leads" />
</div>
```

## Props

- `helpKey` (required): Key to look up help text from the tooltips index
- `position` (optional): Tooltip position - 'top' | 'bottom' | 'left' | 'right' (default: 'top')
- `className` (optional): Additional CSS classes

## Available Help Keys

### Dashboard
- `dashboard.total-leads`
- `dashboard.total-capacity`
- `dashboard.total-revenue`
- `dashboard.total-pipeline`
- `dashboard.approved-projects`
- `dashboard.pending-installation`
- `dashboard.submitted-for-subsidy`
- `dashboard.subsidy-credited`
- `dashboard.amount-received`
- `dashboard.outstanding-balance`

### Support Tickets
- `support-tickets.open`
- `support-tickets.in-progress`
- `support-tickets.closed`
- `support-tickets.overdue`
- `support-tickets.ticket-number`
- `support-tickets.follow-up`

### Financial Metrics
- `finance.revenue`
- `finance.profitability`
- `finance.gross-profit`
- `finance.expected-profit`
- `finance.payment-status`
- `finance.tally-export`

### Project Metrics
- `project.status`
- `project.system-capacity`
- `project.order-value`
- `project.confirmation-date`

## Behavior

- Shows on hover (desktop)
- Shows on click (mobile-friendly)
- Automatically positions to stay within viewport
- Closes when clicking outside
- Accessible with ARIA labels
