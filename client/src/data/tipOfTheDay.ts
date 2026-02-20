/**
 * Tip of the Day – Client-side implementation (Option 1)
 * Add this file and a small UI component to show one tip per day.
 *
 * USAGE:
 * 1. Import: import { getTipForToday, shouldShowTip, markTipShown, markDontShowAgain } from '../data/tipOfTheDay'
 * 2. On Dashboard (or Layout) mount: if (shouldShowTip()) setShowTip(true) and setTip(getTipForToday())
 * 3. On "Got it" click: markTipShown(); setShowTip(false)
 * 4. On "Don't show again" click: markDontShowAgain(); setShowTip(false)
 */

const STORAGE_KEY_LAST_SHOWN = 'rayenna_tip_last_shown'
const STORAGE_KEY_DONT_SHOW = 'rayenna_tip_dont_show'

/** Tips – add or edit as needed. Rotates by day of year. */
export const TIPS: string[] = [
  // General
  'Use the Dashboard filters (FY, Quarter, Month) to focus on specific periods.',
  'Press ? from any page to open context-sensitive Help.',
  'Create Support Tickets from the project detail page to track customer issues.',
  'Use the Audit & Security page to review login and key system events.',
  'Customer Master stores customer details used across projects and proposals.',
  'Reset Password links in the Users module generate a 24-hour token for the user.',
  'Export data to Tally format from the Tally Export menu (Admin and Finance roles).',
  'Add follow-ups to Support Tickets to track resolution progress.',
  // Revenue & Pipeline
  'Revenue = Order Value of Confirmed, Installation, Completed, and Subsidy Credited projects.',
  'Pipeline = Order Value of all project stages except Lost.',
  'Pipeline Conversion % = (Total Revenue / Total Pipeline) × 100.',
  'Lost projects are excluded from Pipeline – mark lost deals promptly to keep metrics accurate.',
  // Projects by Stage & charts
  'Projects by Stage chart shows project counts by execution status; Lost is excluded so the chart focuses on active pipeline.',
  'Revenue & Profit by FY appears next to Projects by Stage on Sales and Management dashboards – use both for a quick overview.',
  'Projects Availing Loans by Bank chart shows how many projects use each financing bank (Sales, Finance, Management).',
  'Customer Profitability word cloud: larger names mean higher profit contribution – use it to spot your best customers.',
  // Projects page
  'Use the Projects page filters to find projects by status, type, salesperson, or Availing Loan.',
  'Filter by Availing Loan on the Projects page to see only projects with customer financing.',
  'Sort by System Capacity or Order Value on Projects: blank values are treated as zero for consistent ordering.',
  'Select multiple projects on the Projects page to see subtotals for Order Value, Amount Received, and Outstanding at the bottom.',
  'Hover over Pending or Partial in the Payment Status column to see the outstanding balance amount.',
  'Project page filters (Status, FY, Quarter, Month, Payment Status, Availing Loan) are remembered as you navigate.',
  // Quick Access & dashboard behaviour
  'Click any Quick Access tile on your dashboard to open Projects with matching filters already applied.',
  'Set FY, Quarter, and Month on the dashboard – tile counts and Quick Access links respect these filters.',
  'The Payment Status tile on Management dashboard shows Pending, Partial, and Fully Paid counts.',
  'Operations: Completed Installation tile shows both Completed and Subsidy Credited projects.',
  // Sales-focused
  'Your Sales dashboard shows only your projects – use it to track your pipeline at a glance.',
  'Total Leads counts projects in the Lead stage only. Move leads to Site Survey or Proposal to grow Open Deals.',
  'Open Deals = Lead + Site Survey + Proposal. Focus on moving these to Confirmed for better conversion.',
  'My Confirmed Orders tile on the Sales dashboard links to your confirmed projects – click to open the filtered list.',
  'Use the Revenue by Lead Source chart to see which channels bring in the most confirmed business.',
  'Pipeline by Lead Source helps you prioritize follow-up on high-value lead sources.',
  'Add customers in Customer Master first, then create projects linked to them for a clean workflow.',
  'Move projects from Proposal to Confirmed quickly to improve your conversion rate.',
  'Use FY and Quarter filters on your dashboard to compare your performance across periods.',
  'Site Survey and Proposal stage counts help you see how many deals are in active negotiation.',
  'Create Support Tickets for your project customers to ensure issues are tracked and resolved.',
  // Management-focused
  'Management dashboard shows company-wide data – use it for team oversight and strategic decisions.',
  'Sales Team Performance treemap (Management/Admin) shows each team member’s revenue at a glance.',
  'Management has two rows of Quick Access tiles: row 1 for leads and orders, row 2 for installation, subsidy, Availing Loan, and payment status.',
  'Year-on-Year tile on Management dashboard compares capacity, pipeline, revenue, and profit to the same period last year.',
  'Management role is read-only: you can view all dashboards, projects, and reports but cannot edit records.',
  'Use Revenue by Sales Team and Pipeline by Customer Segment on the Management dashboard to spot trends and gaps.',
]

/**
 * Returns the tip for today. Uses day-of-year modulo to rotate through tips.
 */
export function getTipForToday(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const index = dayOfYear % TIPS.length
  return TIPS[index]
}

/**
 * Whether we should show the tip today.
 * Returns false if user chose "Don't show again" or if we already showed today.
 */
export function shouldShowTip(): boolean {
  if (typeof window === 'undefined') return false
  if (localStorage.getItem(STORAGE_KEY_DONT_SHOW) === '1') return false

  const lastShown = localStorage.getItem(STORAGE_KEY_LAST_SHOWN)
  if (!lastShown) return true

  const today = new Date().toDateString()
  return lastShown !== today
}

/**
 * Call when user dismisses the tip. Stores today's date so we don't show again today.
 */
export function markTipShown(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_LAST_SHOWN, new Date().toDateString())
}

/**
 * Call when user clicks "Don't show again". Tip will not show until they clear this.
 */
export function markDontShowAgain(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_DONT_SHOW, '1')
}

/**
 * Reset "Don't show again" – useful for testing or if user changes mind.
 * Can be called from browser console: localStorage.removeItem('rayenna_tip_dont_show')
 */
export function resetDontShowAgain(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_DONT_SHOW)
}
