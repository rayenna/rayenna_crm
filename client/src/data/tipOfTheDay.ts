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
/**
 * Suppress tip for the current day only (user opted out "for today").
 * Stored as `Date.toDateString()` so it naturally resets tomorrow.
 */
const STORAGE_KEY_SUPPRESS_TODAY = 'rayenna_tip_suppress_today'

/** Tips – add or edit as needed. Rotates by day of year. */
export const TIPS: string[] = [
  // General
  'Use the Dashboard filters (FY, Quarter, Month) to focus on specific periods.',
  'Press ? from any page to open context-sensitive Help — open Analytics & Reports there for dashboard filters, Quick Access layouts by role, and the Proposal Engine summary card.',
  'Keyboard shortcuts (when focus is not in a text field or dropdown): ? Help · Ctrl+Shift+D Dashboard · C Customers · P Projects · K Support Tickets · Z Zenith · M new customer · E new project. On Mac use ⌘⇧ instead of Ctrl+Shift. Full list in Help under Getting Started or Analytics.',
  'Press Ctrl+Shift+Z (⌘⇧Z on Mac) to jump straight to Zenith — same roles that see Zenith ✦ under the Dashboard menu.',
  'Ctrl+Shift+M (⌘⇧M) opens Customers with the New Customer form (Sales, Management, Admin). Same if you open /customers?new=1 after login. Ctrl+Shift+E (⌘⇧E) opens New Project for Admin and Sales.',
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
  'System Capacity (kW) is stored as a whole number. In Project Lifecycle, Inverter Capacity (kW) defaults to that value until you change it — handy when they match.',
  'Project Detail uses card layout: labels and values align on larger screens and stack on phones; Payment Tracking shows each installment in its own block.',
  'In Project Lifecycle you can record Panel Type (DCR/Non-DCR), Panel Capacity (W), Inverter Brand, and Inverter Capacity (kW) for accurate system specs.',
  'Use the Projects page filters to find projects by status, type, salesperson, or Availing Loan.',
  'Filter by Availing Loan on the Projects page to see only projects with customer financing.',
  'Sort by System Capacity or Order Value on Projects: blank values are treated as zero for consistent ordering.',
  'Select multiple projects on the Projects page to see subtotals for Order Value, Amount Received, and Outstanding at the bottom.',
  'Projects list: Pending or Partial (with a balance) opens a balance popover that matches the Deal Health card — hover on laptop, tap on touch. Same dark panel and teal accent.',
  'When availing loan and a bank are set, the small bank icon under the salesperson shows the financing bank name on hover or tap — same Deal Health–style popover.',
  'Project page filters (Status, FY, Quarter, Month, Payment Status, Availing Loan) are remembered as you navigate.',
  'Projects: use Sort By → Deal Health Score to surface the most at-risk deals (0–100). Hover the health badge for a quick breakdown.',
  'Deal Health “Deal value” peaks for order values in the ₹1.75L–₹3L band (typical 3–5 kW sweet spot); very large orders score fewer points on that factor — see Help → Projects → Deal Health Score for the full table.',
  'Deal Health “Close date” uses Confirmation date and Advance received vs order value (not expected commissioning alone). Help → Projects → Deal Health Score lists every rule.',
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
  'Proposal Engine custom sections (before the Bill of Quantities) now support a full word-processor toolbar — font, size, colour, highlight, bold/italic/underline, lists, tables with row/column controls, and image upload. Add project-specific content like case studies or site photos directly in the proposal.',
  // Zenith Command Center
  'Open Zenith ✦ from the Dashboard menu for a full-screen analytics view — same FY, Quarter, and Month rules as the classic dashboard.',
  'Zenith is built to be the future of Rayenna CRM: one command bar, server-backed data after login, and charts you can click through to project lists.',
  'Zenith tickers: Solar News (above) marquees industry RSS headlines — server-aggregated on a schedule, click a headline for the article in a new tab, hover to pause on desktop. AI Insights (below) is plain-English highlights from your CRM data for the current filters — hover to pause, click a line to jump to a related section.',
  'Zenith Your Focus sits below the Deal flow funnel in Pipeline and priorities: Sales see pipeline (Sl No. / Prj #, Deal Health, Log activity) plus Proposal Engine rows (click a PE bucket → Quick Actions list → Open in Projects); Finance see Payment radar (ageing buckets, Top overdue, Latest payments received, shared payment-status legend, Remind for WhatsApp/Email); Operations see Installation pulse (progress, + Log update, horizontal scroll on phones); Management and Admin see all panels including Proposal Engine.',
  'Zenith Payment radar: click a payment ageing band (0–30 through 90+ days) to filter Top overdue; Latest payments received lists recent receipts beside Top overdue on wide layouts; Sl No. on both tables; click a project name to open the Finance quick drawer when that path is wired; the legend under the tables explains name colours by payment status; use Remind for prefilled WhatsApp or Email — your app sends the message, not Rayenna.',
  'Zenith Installation pulse: sort by any column, toggle Overdue only, and use + Log update to open Quick Actions with the note field focused. On narrow screens the table scrolls sideways; the Last note column hides on small phones — open the project or use Log update for full remarks.',
  'Zenith tables: click a column header to sort (e.g. Deal value, Health, Last activity). Sl No. / Prj # is for reading context on pipeline and Hit List, not a sort control. Use Filter customer…, All stages, and All salespeople where shown — including Today’s Hit List (up to seven urgent deals) and Your pipeline today under Your Focus.',
  'Deal Health badges appear in Zenith Pipeline and Hit List — hover a badge to see what’s hurting the score (activity, momentum, value, confirmation/advance, source).',
  'Zenith: Today’s Hit List shows up to seven urgent deals with the same filter/sort pattern as Company pipeline today, plus Sl No. / Prj # and an Alert column — Open → opens Quick Actions. On tablet/desktop widths, a short hint may remind you to scroll the table and use Open →; on small phones that hint is hidden so the layout stays clean.',
  'Zenith Quick Actions: list rows show Sales (assigned salesperson) under each customer name; single-project headers show Sales next to the project name — Operations and Finance drawers too. Scroll to Recent remarks before Log activity — same remark history as Project detail, read-only in the drawer; use Open full project for edits.',
  'Zenith single-project drawers: after Deal value, Quick Actions and Operations show a Payment card — status, total received, balance pending — or N/A when payment does not apply (no order value or early/Lost stage). Finance Payment radar uses its own drawer payment summary.',
  'Zenith The Board: pick Month, Quarter (Indian FY), or FY on the card — rankings use stage-entered / confirmation dates so periods can show different totals. Click header totals or a salesperson’s value to open the same Quick Actions list drawer as Explore charts; use Open in Projects → for the full Projects grid with matching filters.',
  'Zenith Your Focus: pipeline, payment radar, installation pulse, and Proposal Engine (where shown) start collapsed — click each panel header to expand only what you need.',
  'Zenith Victory toast: when a project moves to Confirmed, Under Installation, Completed, or Subsidy Credited (Quick Actions or project save), a short celebration toast appears — auto-dismisses or tap ×.',
  'Sales in Zenith: use Log activity in Your Focus to add a quick project remark — it updates last-activity signals for your pipeline row.',
  'Zenith KPI cards count up when you load or change date filters, show a 7-point FY sparkline (gold up, crimson down), and a teal/crimson % badge when a prior-period comparison exists.',
  'In Zenith, select exactly one Financial Year to see comparison % badges on KPI tiles when a prior-period comparison is available.',
  'Zenith Revenue forecast: the headline is weighted by stage (deal value × win probability) — tabs split the same total by Source, Sales, Segment, or Stage; +N more opens all open deals in the drawer.',
  'Zenith Revenue forecast tile height is fixed on purpose so switching tabs does not jitter the Hit List or funnel beside it.',
  'Zenith — Revenue & profit by FY: tap the orange point for a revenue project list (totals = order value); tap the teal bar for profit (totals = gross profit). Small or zero bars still open profit for that year.',
  'When you filter Zenith to one or more FYs, the Revenue & profit by FY chart only shows those years — hover matches what you filtered.',
  'Zenith Customer projects profitability matches the classic dashboard word cloud: larger names = higher project profitability; Top 10 is the same data sorted for reading.',
  'Zenith Explore the landscape: where you see Click to explore, drill-down opens the Quick Actions drawer — list totals match the chart (FY profit uses gross profit in the footer).',
  'Zenith Operations: the KPI row covers Pending Installation, Completed Installation, Subsidy Credited, and Confirmed Revenue for your selected dates.',
  'Zenith Finance: watch Total Revenue, Amount Received, Outstanding, Total Profit, and Availing Loan — all scoped to your filters. Click Availing Loan to open the Quick Actions list (like chart drill-down), then Open in Projects → if you need the full grid.',
  'Zenith executive (Sales, Management, Admin): the Availing Loan KPI tile also opens Quick Actions first — same pattern as charts and the funnel. The classic Dashboard Quick Access Availing Loan metric tile still links straight to Projects with the filter.',
  'Use Reset in the Zenith command bar to clear FY, Quarter, and Month and refresh the unscoped summary.',
  'From Zenith, press ? (outside text fields) to open Help on Analytics — full Zenith guide under Zenith Command Center, Revenue forecast, and Explore charts & drill-down.',
  'Zenith Deal flow funnel: click a stage row or payment pill to open Quick Actions with the same cohort as the funnel counts; Open in Projects → opens Projects with matching stage or payment filters.',
  'Zenith Proposal Engine under Your Focus: each bucket row opens the Quick Actions list (same project IDs the summary used), then Open in Projects → for that PE bucket with your FY / Quarter / Month.',
  'Zenith drawer lists use a server batch (up to about 5,000 recently updated projects). Open in Projects → uses full Projects filters — if you have huge volumes, counts can differ slightly.',
  'Zenith funnel and chart drill-downs use the same date scope as the rest of Zenith — open Help → Analytics for the full behaviour.',
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
  const today = new Date().toDateString()
  try {
    if (localStorage.getItem(STORAGE_KEY_SUPPRESS_TODAY) === today) return false
  } catch {
    // If storage is unavailable, fail open: still show the tip (non-critical).
  }

  let lastShown: string | null = null
  try {
    lastShown = localStorage.getItem(STORAGE_KEY_LAST_SHOWN)
  } catch {
    lastShown = null
  }
  if (!lastShown) return true

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
 * Call when user clicks "Don't show again today". Tip will not show again for the rest of the day.
 */
export function markDontShowAgain(): void {
  if (typeof window === 'undefined') return
  const today = new Date().toDateString()
  setLocalStorageItem(STORAGE_KEY_SUPPRESS_TODAY, today)
  setLocalStorageItem(STORAGE_KEY_LAST_SHOWN, today)
}

/**
 * Reset tip suppression for today — useful for testing.
 * Can be called from browser console:
 * - `localStorage.removeItem('rayenna_tip_last_shown')`
 * - `localStorage.removeItem('rayenna_tip_suppress_today')`
 */
export function resetDontShowAgain(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_SUPPRESS_TODAY)
}
