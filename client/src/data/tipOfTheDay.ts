import { setLocalStorageItem } from '../lib/safeLocalStorage'

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
  'Press ? from any page to open context-sensitive Help — open Analytics & Reports there for dashboard filters, Quick Access layouts by role, and the Proposal Engine summary card.',
  'Keyboard shortcuts (when focus is not in a text field or dropdown): ? Help · Ctrl+Shift+D Dashboard · C Customers · P Projects · K Support Tickets · Z Zenith · M new customer · E new project. On Mac use ⌘⇧ instead of Ctrl+Shift. Full list in Help under Getting Started or Analytics.',
  'Press Ctrl+Shift+Z (⌘⇧Z on Mac) to jump straight to Zenith — same roles that see Zenith ✦ under the Dashboard menu.',
  'Ctrl+Shift+M (⌘⇧M) opens the new-customer form (Sales, Management, Admin). Ctrl+Shift+E (⌘⇧E) opens New Project for Admin and Sales.',
  'On a Help page, press Esc to return to the Dashboard. The Help docs include a full keyboard shortcut table under Getting Started and Analytics & Reports.',
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
  'In Project Lifecycle you can record Panel Type (DCR/Non-DCR) and Panel Capacity (W) for accurate system specs.',
  'Use the Projects page filters to find projects by status, type, salesperson, or Availing Loan.',
  'Filter by Availing Loan on the Projects page to see only projects with customer financing.',
  'Sort by System Capacity or Order Value on Projects: blank values are treated as zero for consistent ordering.',
  'Select multiple projects on the Projects page to see subtotals for Order Value, Amount Received, and Outstanding at the bottom.',
  'Hover over Pending or Partial in the Payment Status column to see the outstanding balance amount.',
  'Project page filters (Status, FY, Quarter, Month, Payment Status, Availing Loan) are remembered as you navigate.',
  // Quick Access & dashboard behaviour
  'Click any Quick Access tile on your dashboard to open Projects with matching filters already applied.',
  'Set FY, Quarter, and Month on the dashboard – tile counts and Quick Access links respect these filters.',
  'The Payment Status card lists each payment bucket as a row (e.g. Pending, Partial, Fully Paid, N/A) — click a row to open Projects with that payment filter and your dashboard dates.',
  'Operations: Completed Installation tile shows both Completed and Subsidy Credited projects.',
  // Sales-focused
  'Your Sales dashboard shows only your projects – use it to track your pipeline at a glance.',
  'Total Leads counts projects in the Lead stage only. Move leads to Site Survey or Proposal to grow Open Deals.',
  'Open Deals = Lead + Site Survey + Proposal. Focus on moving these to Confirmed for better conversion.',
  'My Confirmed Orders tile on the Sales dashboard links to your confirmed projects – click to open the filtered list.',
  'Sales Quick Access is a 3×3 grid on large screens: row 1 is My Leads, Site Survey, Proposal; row 2 is Open Deals, My Confirmed Orders, Under Installation; row 3 is Payment Status, Completed Installation, and Proposal Engine — three equal-width columns.',
  'Under Installation on the Sales dashboard counts projects in Under Installation stage only (not Confirmed).',
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
  'Management Quick Access uses three rows: four funnel tiles, four execution tiles (including Subsidy Credited), then Payment Status, Availing Loan, and Proposal Engine in three equal columns on desktop.',
  'Year-on-Year tile on Management dashboard compares capacity, pipeline, revenue, and profit to the same period last year.',
  'Management role is read-only: you can view all dashboards, projects, and reports but cannot edit records.',
  'Use Revenue by Sales Team and Pipeline by Customer Segment on the Management dashboard to spot trends and gaps.',
  // Proposal Engine
  'Use the Proposals (New) button on Project Detail to open Proposal Engine with your CRM login and link proposals to that project.',
  'A project is marked Proposal Ready only when all four artifacts are saved in Proposal Engine: Costing Sheet, BOM, ROI, and Proposal.',
  'Save frequently used Costing configurations as templates in Proposal Engine – they are shared across all Sales and Admin users.',
  'Only Admin can delete shared Costing templates in Proposal Engine; Sales can save and use them but not remove them.',
  'Operations, Management, and Finance can open Proposal Engine from Proposals (New) to review Costing, BOM, ROI, and Proposal in read-only mode.',
  // Zenith Command Center
  'Open Zenith ✦ from the Dashboard menu for a full-screen analytics view — same FY, Quarter, and Month rules as the classic dashboard.',
  'Zenith AI Insights: under the command bar, a scrolling ribbon shows plain-English highlights from your current data — hover to pause, click any line to jump to a related section.',
  'Zenith Your Focus sits between KPIs and the funnel: Sales see their pipeline table with follow-up styling; Finance see payment radar; Operations see installation pulse; Management and Admin see all three blocks.',
  'Sales in Zenith: use Log activity in Your Focus to add a quick project remark — it updates last-activity signals for your pipeline row.',
  'Zenith KPI cards count up when you load or change date filters, show a 7-point FY sparkline (gold up, crimson down), and a teal/crimson % badge when a prior-period comparison exists.',
  'In Zenith, select exactly one Financial Year to see comparison % badges on KPI tiles when a prior-period comparison is available.',
  'Zenith Operations: the KPI row covers Pending Installation, Completed Installation, Subsidy Credited, and Confirmed Revenue for your selected dates.',
  'Zenith Finance: watch Total Revenue, Amount Received, Outstanding, Total Profit, and Availing Loan — all scoped to your filters.',
  'Use Reset in the Zenith command bar to clear FY, Quarter, and Month and refresh the unscoped summary.',
  'From Zenith, press ? (outside text fields) to open Help on Analytics — it jumps straight to the Zenith Command Center subsection.',
  'Zenith funnel and chart tiles often link to Projects with the same date filters — click through to reconcile lists with what you saw.',
  'Sales Zenith shows your data only (like your Sales dashboard); Management and Admin see company-wide executive metrics.',
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
  setLocalStorageItem(STORAGE_KEY_LAST_SHOWN, new Date().toDateString())
}

/**
 * Call when user clicks "Don't show again". Tip will not show until they clear this.
 */
export function markDontShowAgain(): void {
  if (typeof window === 'undefined') return
  setLocalStorageItem(STORAGE_KEY_DONT_SHOW, '1')
}

/**
 * Reset "Don't show again" – useful for testing or if user changes mind.
 * Can be called from browser console: localStorage.removeItem('rayenna_tip_dont_show')
 */
export function resetDontShowAgain(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_DONT_SHOW)
}
