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

The score is **computed in the app** from five factors: **Activity** (last update), **Momentum** (time in stage), **Deal value** (order value bands tuned for typical **3–5 kW** sweet-spot deals), **Close date** (in Rayenna this uses **confirmation date** plus **advance received** vs order value — see tables below), and **Lead source**. When you **hover** a **Deal Health** badge (or **tap** it on touch devices), you see the **five building blocks** and how each one scored. On **Project Detail**, the **Deal Health Score** card shows the same breakdown plus a short **insight** that usually highlights the **weakest** area so you know what to fix first. On the **Projects** list, **payment balance**, **financing bank**, and **lead source detail** hints use the **same popover shell** (dark card, theme-aware accents) for a consistent experience.

### Illustration — how the score adds up

The total is the **sum** of five parts. Each part has a **maximum**; the overall score is **capped at 100**.

```deal-health-figure
```

| Factor (label on the card) | Max pts | In plain words |
| :-- | --: | :-- |
| **Activity** | 30 | How recently someone updated the project |
| **Momentum** | 25 | How long the deal has sat in the **current stage** vs what is typical for that stage |
| **Deal value** | 20 | Order value band — **highest points** in the **₹1.75L–₹3L** range (typical 3–5 kW sweet spot) |
| **Close date** | 15 | **Confirmation date** (Sales & Commercial) + **Advance received** vs **order value** (Payment tracking) |
| **Lead source** | 10 | Referral and partner-style sources score higher than unknown |

**Colour / letter bands (typical):** **A** Healthy (~75+), **B** Good (~55+), **C** At risk (~35+), **D** Weak (~15+), **F** Critical (below ~15). Exact thresholds match the live app.

### When you see it (and when you do not)

- **Shown** for deals that are still in the **active pipeline** (not finished or lost).
- **Not shown** for **terminal** outcomes, including **Completed**, **Subsidy Credited** (and combined/loan variants where applicable), and **Lost** — those stages no longer need a health signal.

### Where it appears in the app

| Location | What you get |
| :-- | :-- |
| **Projects** list | A compact **Deal Health** **badge** (0–100) next to the project/customer — **hover** or **tap** for the factor breakdown **popover**. **Pending** / **Partial** payment pills (with balance), the **financing bank** icon (loan + bank set), and **Referral / Channel Partner / Other** lead-source pills (when detail is saved) open **matching** dark-card **popovers**. **Sort** by **Deal Health Score** (ascending shows weakest first — same data the server uses). |
| **Project Detail** | A full **Deal Health Score** card with **all factors**, scores, and the insight line. |
| **Zenith (Executive view)** | **Your pipeline today** (Sales / Management / Admin): each row can show a **Deal Health** badge; **hover** for the breakdown; **Open →** opens **Quick Actions**. **Today’s Hit List** matches that table pattern (**filters**, **sort**, **last activity**, **confirmation date**, **Alert**), capped to up to **seven** urgent deals; when deals list, a short hint may remind you to **scroll right** and use **Open →**; **Open →** opens **Quick Actions** with **Recent remarks** (read-only) above **Log activity** where shown. |
| **Tip of the Day** | Occasionally reminds you about Deal Health, sorting, and these rules. |

### How each factor is scored (reference tables)

**1. Activity (max 30)** — days since the **last update** on the project (last modified–style timestamp).

| Days since last update | Points |
| :-- | --: |
| 3 days or less | 30 |
| 4–7 days | 22 |
| 8–14 days | 12 |
| 15–30 days | 5 |
| More than 30 days | 0 |

**2. Momentum (max 25)** — **Days in current stage** vs a **typical** duration for that stage: Lead ~7, Site Survey ~14, Proposal ~21, Confirmed ~30, Under Installation ~45, Submitted for Subsidy ~21 (other stages use a default expectation).

| Time in stage vs expected | Points |
| :-- | --: |
| Within the expected window | 25 |
| Up to 1.5× the expected window | 15 |
| Up to 2× the expected window | 8 |
| Beyond 2× | 0 |

**3. Deal value (max 20)** — uses **order / deal value** (same field as **Order value** on the project). Scoring favours Rayenna’s **typical 3–5 kW** commercial band.

| Order value (₹) | Points |
| :-- | --: |
| Not set or **zero** | 0 |
| **Greater than 0** and **below ₹1,50,000** | 5 |
| **₹1,50,000** up to **below ₹1,75,000** | 10 |
| **₹1,75,000** up to **below ₹3,00,000** | 20 |
| **₹3,00,000** up to **below ₹5,00,000** | 10 |
| **₹5,00,000** and above | 5 |

*Boundaries:* **₹5,00,000 exactly** → 5 points. **₹3,00,000 exactly** → 10 points (₹3L–₹5L band). **₹1,75,000 exactly** → 20 points (sweet-spot band). **₹1,50,000 exactly** → 10 points (₹1.5L–₹1.75L band).

**4. Close date (max 15)** — the UI row is still named **Close date**; the maths use **Confirmation date** ( **Sales & Commercial** ) and **Advance received (₹)** ( **Payment tracking** ) vs **order value**.

| Condition | Points |
| :-- | --: |
| Valid **confirmation date** entered | **+5** |
| Same deal: advance **greater than 0**, order value **greater than 0**, and advance **under 50%** of order value (token advance) | **+5** more *(10 total for this factor)* |
| Same deal: advance **greater than 0**, order value **greater than 0**, and advance **at least 50%** of order value | **+10** more *(15 total for this factor)* |

- With **no** confirmation date, this factor scores **0** (advance alone does not count).
- If **order value** is **zero**, the advance **percentage** lines do not add points.

**5. Lead source (max 10)**

| Lead source | Points |
| :-- | --: |
| Referral | 10 |
| Management Connect | 8 |
| Channel Partner | 8 |
| Digital Marketing | 6 |
| Sales | 5 |
| Unknown / other mapped default | 3 |

### How this helps day to day

- **Triage fast:** Scan badges on the **Projects** list or in **Zenith → Your Focus** without opening every record.
- **Sort globally:** **Sort by → Deal Health Score** to pull weaker deals to the top (especially with your usual filters).
- **Know what to fix:** **Hover** the badge or open **Project Detail** — then **log activity**, **move the stage**, **keep order value accurate**, set **confirmation date** and **advance received**, and **correct lead source** as needed.
