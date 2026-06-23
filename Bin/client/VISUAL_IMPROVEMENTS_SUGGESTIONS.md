# Customer Master & Projects – Visual Improvement Suggestions

## Current state
- **Projects:** White cards, gray dividers, gray text. Status badges use pale backgrounds (e.g. `indigo-100` for Confirmed/Under Installation).
- **Customer Master:** Same flat look – white list, primary-100/secondary-100 badges, gray hover.

---

## 1. Status badge colours (Projects) – **especially Confirmed & Under Installation**

| Status | Current | Suggestion | Rationale |
|--------|---------|------------|-----------|
| **Confirmed** | `bg-indigo-100 text-indigo-800` | **Brighter blue** – e.g. `bg-sky-400/20 text-sky-800 border border-sky-400` or `bg-blue-400 text-white` | “Active order” should stand out. |
| **Under Installation** | Same as Confirmed | **Bright cyan/sky** – e.g. `bg-cyan-400 text-white` or `bg-sky-500 text-white` | Clearly “in progress”, more visible. |
| Lead / Site Survey / Proposal | `bg-orange-100` | Keep or use **amber** – e.g. `bg-amber-100 text-amber-800 border-amber-300` | Pipeline stages, warm but distinct. |
| Submitted for Subsidy | `bg-purple-100` | Keep or **slightly brighter** – e.g. `bg-violet-200 text-violet-800` | Still distinct. |
| Completed / Subsidy Credited | `bg-green-100` | **Brighter green** – e.g. `bg-emerald-500 text-white` or `bg-green-400 text-white` | Success = strong green. |
| Lost | `bg-red-100` | Keep or **stronger** – e.g. `bg-red-500 text-white` | Clear “negative” state. |

**Complexity: Low** – One helper (`getStatusColorClasses`) in `Projects.tsx`; ~10 minutes.

---

## 2. Page background and card depth

- **Page background:** Use a very light tint (e.g. `bg-gray-50` or `bg-primary-50/30`) instead of plain white so the content area is clearly defined.
- **Filter/search card:** Add a soft border (e.g. `border border-gray-200`) and/or light shadow (`shadow-md`), optional thin top accent (e.g. `border-t-4 border-primary-500`).
- **List container:** Slightly stronger card – e.g. `rounded-xl shadow-lg border border-gray-100`.

**Complexity: Low** – Class changes on 2–3 wrappers per page; ~15 minutes.

---

## 3. Row hover and list rhythm (Projects & Customer Master)

- **List rows:** Replace `hover:bg-gray-50` with a tinted hover, e.g. `hover:bg-sky-50` or `hover:bg-primary-50/40`, so hover is more visible.
- **Optional:** Very subtle alternating row background (e.g. even rows `bg-gray-50/50`) for long lists.

**Complexity: Low** – One class per list row; ~5 minutes.

---

## 4. Customer Master – badges and hierarchy

- **Customer ID badge:** Make it pop more – e.g. `bg-primary-600 text-white` or `bg-primary-500 text-white` instead of `primary-100/700`.
- **Project count badge:** Use a different colour from ID (e.g. `bg-emerald-500 text-white` or `bg-sky-500 text-white`) so “ID” vs “project count” are visually distinct.
- **Customer name:** Keep primary-600 or use a slightly bolder weight.

**Complexity: Low** – Class changes on 2–3 badge spans; ~10 minutes.

---

## 5. Headings and section labels

- **Page title:** Add a subtle gradient or stronger colour, e.g. `bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent` (already used on dashboard) or keep `text-primary-800` with `font-extrabold`.
- **Filter labels:** Slightly darker or medium weight – e.g. `text-gray-700 font-medium`.

**Complexity: Low** – One title and a few labels per page; ~5 minutes.

---

## 6. Payment status badge (Projects)

- **FULLY_PAID:** Brighter – e.g. `bg-emerald-500 text-white` or `bg-green-500 text-white`.
- **PARTIAL:** Keep yellow or use `bg-amber-400 text-amber-900`.
- **N/A / PENDING:** Keep red or use `bg-red-500 text-white` for consistency with “attention needed”.

**Complexity: Low** – One small helper; ~5 minutes.

---

## Summary – complexity

| Area | Change | Complexity |
|------|--------|------------|
| Status badges (Confirmed / Under Installation brighter) | `getStatusColorClasses` in Projects.tsx | **Low** |
| Other status badges (Completed, Lost, etc.) | Same helper | **Low** |
| Payment badge colours | `getPaymentStatusBadge` in Projects.tsx | **Low** |
| Page background + card styling | Wrapper divs on both pages | **Low** |
| Row hover | List `<li>` / `<Link>` classes | **Low** |
| Customer Master badges | Badge spans in CustomerMaster.tsx | **Low** |
| Headings / labels | Title and filter labels | **Low** |

**Overall: Low.** All changes are CSS/Tailwind only; no new components or logic. Total estimate **~45–60 minutes** for everything above.

---

## Recommended order

1. **Do first:** Brighter Confirmed & Under Installation (and optionally all status + payment badges) – biggest impact for “dull” feel.
2. **Then:** Page background + card depth + row hover.
3. **Then:** Customer Master badge colours and heading tweaks.
