# Deal Health Score

Part of the **[Projects](#projects-module)** module. [Permission matrix](/help/roles#permission-matrix) · [Projects list & detail](#projects-module)

## At a glance

| Where | What you see |
| :-- | :-- |
| **Projects** list | Badge + popover; sort by score |
| **Project detail** | Full card with insight |
| **Zenith** | Pipeline / Hit List badges |

Not shown for **Completed**, **Subsidy Credited**, or **Lost**.

**Deal Health Score** is a **0–100** number that estimates how strong an open deal looks **right now**, based on data already on the project. It is **not** a prediction of whether you will win the deal; it is a **prioritisation aid** so you can see which opportunities need attention (follow-up, stage movement, missing data) before others.

The score is **computed in the app** from **Activity**, **Momentum**, **Deal value** (**₹2L–₹8L** sweet spot), **Commitment**, **Lead source**, and — for **Under Installation** only — **Install confidence** (+15 for booked delivery/install). When you **hover** a **Deal Health** badge (or **tap** it on touch devices), you see each building block. On **Project Detail**, the card shows the same breakdown plus a short **insight**.

### Illustration — how the score adds up

The total is the **sum** of the parts. Each part has a **maximum**; the overall score is **capped at 100**.

```deal-health-figure
```

| Factor (label on the card) | Max pts | In plain words |
| :-- | --: | :-- |
| **Activity** | 30 | How recently someone updated the project (**softer** curve on Under Installation) |
| **Momentum** | 25 | Time in stage vs typical SLA (**Under Installation** ~60 days) |
| **Deal value** | 20 | Order value band — **highest points** in the **₹2L–₹8L** sweet spot; mild discount above ₹8L |
| **Commitment** | 15 | Confirmation + advance + **payment/collection** + expected commissioning (overdue penalises) |
| **Lead source** | 10 | Referral and partner-style sources score higher; Website/Google are scored explicitly |
| **Install confidence** | 15 | **Under Installation only** — confirmed order with material delivery and/or install started |

**Colour / letter bands (typical):** **A** Healthy / **On track** (~75+), **B** Good / **In delivery** (~55+), **C** At risk / **Install risk** / **Neglected** (~35+), **D** Weak / **Install stalled** / **Neglected** (~15+), **F** Critical (below ~15).

### When you see it (and when you do not)

- **Shown** for deals that are still in the **active pipeline** (not finished or lost).
- **Not shown** for **terminal** outcomes, including **Completed**, **Subsidy Credited** (and combined/loan variants where applicable), and **Lost** — those stages no longer need a health signal.

### Where it appears in the app

| Location | What you get |
| :-- | :-- |
| **Projects** list | A compact **Deal Health** **badge** (0–100) next to the project/customer — **hover** or **tap** for the factor breakdown **popover**. **Sort** by **Deal Health Score** (ascending shows weakest first — same maths the server uses). |
| **Project Detail** | A full **Deal Health Score** card with **all factors**, scores, and the insight line. |
| **Zenith (Executive view)** | **Your pipeline today** and **Today’s Hit List**: each row can show a **Deal Health** badge; **hover** for the breakdown. |

### How each factor is scored (reference tables)

**1. Activity (max 30)** — days since the **last meaningful touch**: latest of **project remark**, **My Day** task activity (detail), **payment date**, or **record update**. When stage-entered time is missing and Momentum uses the same clock, Activity is **dampened** (not on Under Installation).

| Days since last update | Points |
| :-- | --: |
| 3 days or less | 30 |
| 4–7 days | 22 |
| 8–14 days | 12 |
| 15–30 days | 5 |
| More than 30 days | 0 |

**2. Momentum (max 25)** — **Days in current stage** (from **stage entered** when available) vs a **typical** duration for that stage: Lead ~7, Site Survey ~14, Proposal ~21, Confirmed ~30, Under Installation ~60, Submitted for Subsidy ~21 (other stages use a default expectation).

**Activity for Under Installation** — softer than pipeline stages: ≤7d → 30, ≤14 → 22, ≤30 → 15, ≤60 → 8, else 0.

| Time in stage vs expected | Points |
| :-- | --: |
| Within the expected window | 25 |
| Up to 1.5× the expected window | 15 |
| Up to 2× the expected window | 8 |
| Beyond 2× | 0 |

**3. Deal value (max 20)** — uses **order / deal value**. Soft sweet spot **₹2L–₹8L**; mild discount for larger deals.

| Order value (₹) | Points |
| :-- | --: |
| Not set or **zero** | 0 |
| **Greater than 0** and **below ₹2,00,000** | 10 |
| **₹2,00,000** up to **₹8,00,000** (inclusive) | 20 |
| **Above ₹8,00,000** and **below ₹15,00,000** | 15 |
| **₹15,00,000** and above | 12 |

**4. Commitment (max 15)** — confirmation, money in, **payment/collection health**, and expected commissioning (folded in; no extra bar).

**When confirmation is set, or stage is Confirmed / Under Installation / Submitted for Subsidy:**

| Condition | Points |
| :-- | --: |
| Valid **confirmation date** | **+4** |
| Advance **under 50%** of order (and &gt; 0) | **+3** |
| Advance **≥ 50%** of order | **+6** |
| Payment **Fully paid** (or balance ≤ 0 with advance) | **+5** |
| Payment **Partial** / balance outstanding | **+3** |
| Payment **Pending** after confirmation | **+1** |
| Expected commissioning **overdue** | **−3** (floor 0) |

**When still Lead / Site Survey / Proposal and no confirmation yet:**

| Condition | Points |
| :-- | --: |
| Order value entered | **+5** |
| Expected commissioning in the future | **+10** |
| Expected commissioning overdue | **+3** |
| No expected commissioning yet | **+5** (partial credit) |

**5. Lead source (max 10)**

| Lead source | Points |
| :-- | --: |
| Referral | 10 |
| Management Connect | 8 |
| Channel Partner | 8 |
| Digital Marketing | 6 |
| Sales | 5 |
| Website | 4 |
| Google | 4 |
| Other | 3 |
| Unknown / empty | 2 |

**6. Install confidence (max 15)** — only when stage is **Under Installation**: flat **+15** (booked deal with delivery/install underway). Not shown on other stages. Score still capped at **100**.

### How this helps day to day

- **Triage fast:** Scan badges on the **Projects** list or in **Zenith → Your Focus** without opening every record.
- **Sort globally:** **Sort by → Deal Health Score** to pull weaker or neglected deals to the top.
- **Know what to fix:** **Hover** the badge or open **Project Detail** — then **log activity**, **move the stage**, keep **order value** accurate, set **confirmation / advance** or **expected commissioning**, and **correct lead source** as needed.
