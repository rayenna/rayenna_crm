/**
 * Tip of the Day — Proposal Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror of client/src/data/tipOfTheDay.ts in the Rayenna CRM.
 * Same structure and helper functions; Proposal-Engine-specific localStorage
 * keys avoid collision if both apps ever run on the same origin.
 *
 * FUTURE INTEGRATION:
 * When merging with the CRM, concatenate this TIPS array with the CRM TIPS
 * array and unify the localStorage keys. No other code changes are needed.
 *
 * USAGE:
 * 1. Import: import { getTipForToday, shouldShowTip, markTipShown, markDontShowAgain } from '../data/tipOfTheDay'
 * 2. On Layout mount: if (shouldShowTip()) setShowTip(true) and setTip(getTipForToday())
 * 3. On "Got it" click: markTipShown(); setShowTip(false)
 * 4. On "Don't show again" click: markDontShowAgain(); setShowTip(false)
 */

import { setLocalStorageItem } from '../lib/safeLocalStorage'

const STORAGE_KEY_LAST_SHOWN = 'rayenna_pe_tip_last_shown'
const STORAGE_KEY_DONT_SHOW  = 'rayenna_pe_tip_dont_show'

/** Tips — rotates by day of year. Add or edit as needed. */
export const TIPS: string[] = [
  // ── Customers ──────────────────────────────────────────────────────────────
  'Use the Dashboard (Proposal Command Center) active project banner or the Customers / Projects page to choose which project is active — all four pages always work on the active project.',
  'Use the "+ Select Project" button on the Customers / Projects page to pull projects from Rayenna CRM — customer name, address, contacts and system size are filled in automatically.',
  'The pulsing blue dot in the navbar shows which customer is currently active. Check it before saving any work.',
  'Document readiness shows as PE Ready when all four artifacts are saved (same labels as CRM: Not Yet Created, PE Draft, PE Ready).',
  'Use the search bar on the Customers page to quickly find a customer by name or location.',

  // ── Costing Sheet ───────────────────────────────────────────────────────────
  'Six built-in templates cover the most common Rayenna project types — always start from the closest template and adjust.',
  'The grand total updates in real time as you type — no need to save to see the impact of a price change.',
  'Set your Margin % before saving — it is factored into the grand total and passed to the ROI Calculator automatically.',
  'When loading a template, choose "Append" to add items to an existing sheet, or "Replace" to start fresh.',
  'GST rates default to 5% for PV Modules and Inverters, and 18% for everything else — override per row if needed.',
  'Save a customised sheet as a Template to reuse it for future customers of the same project type.',
  'Use the Collapse All toggle to get a quick category-level summary without scrolling through every line item.',

  // ── BOM ─────────────────────────────────────────────────────────────────────
  'The BOM is auto-generated when you save the Costing Sheet — you do not need to build it manually.',
  'Put make, model, and technical detail in each BOM Specification — that text appears in the proposal Bill of Quantities.',
  'Use the Expand All / Collapse All toggle in the BOM to quickly review all items or focus on one category.',
  'Add manual rows inside any category group using the "+ Add Row" button for items not in the costing sheet.',
  'Auto-generated rows are tagged with an "auto" badge; rows you add manually show "manual" — easy to distinguish.',

  // ── ROI Calculator ──────────────────────────────────────────────────────────
  'System size and project cost are auto-filled from the Costing Sheet — you mainly need to review the tariff and escalation rate.',
  'The default generation factor of 1500 kWh/kW/year is the Kerala average — adjust for other states or shading conditions.',
  'Blue bars on the 25-year chart are pre-payback years; green bars are post-payback — the more green, the better the ROI.',
  'LCOE (Levelised Cost of Energy) should be well below the current grid tariff — a good indicator of project viability.',
  'Always click "Save Result" after calculating — unsaved ROI results will not appear in the Proposal\'s Financial Benefits section.',

  // ── Proposal ────────────────────────────────────────────────────────────────
  'Generate the Proposal only after saving the Costing Sheet, BOM, and ROI result — all three feed into the proposal automatically.',
  'Use the Edit button to make inline changes directly on the proposal text — click any paragraph and type your changes.',
  'An amber border around the proposal confirms you are in Edit mode — click the Edit button again to exit without saving.',
  'Use the main Save action (top-right or at the bottom) to save everything in one shot: inline edits, BOM comments, and all four artifacts.',
  'Add per-category notes in the Bill of Quantities section to specify brands or special conditions (e.g. "Adani DCR modules as per MNRE list").',
  'For AI Roof Layout (Beta): click “Save for proposal”, then enable “Include AI Roof Layout (Beta) in proposal” and Save — it persists per CRM project.',
  'PDF export captures your inline edits automatically because it renders the live document — always save before exporting.',
  'DOCX export also reflects your inline edits — the saved text overrides are applied to every section of the Word document.',
  'The proposal reference number (REY/YYYY/MM/XXXXX) is generated automatically — it is unique to each generation.',

  // ── Export & Data ───────────────────────────────────────────────────────────
  'Enable "Background graphics" in your browser\'s print settings for the best PDF output — logos and colour headers will print correctly.',
  'Proposals and artifacts are stored in the Rayenna CRM backend; your browser workspace is used only for WIP and templates.',
  'Use XLSX export on the Costing Sheet to get a formatted Excel file with subtotals, GST rows, margin, and grand total.',
  'The BOM XLSX export includes Item Name, Specification, Quantity, and GST % — useful for procurement teams.',

  // ── Workflow ─────────────────────────────────────────────────────────────────
  'Press ? from any page to open the User Guide instantly.',
]

/**
 * Returns the tip for today. Uses day-of-year modulo to rotate through tips.
 */
export function getTipForToday(): string {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff  = now.getTime() - start.getTime()
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
 * Reset "Don't show again" — useful if user changes their mind.
 * Can also be called from browser console: localStorage.removeItem('rayenna_pe_tip_dont_show')
 */
export function resetDontShowAgain(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_DONT_SHOW)
}
