# Solar Hub handover

Install **Rayenna Solar Hub** on the homeowner’s phone at handover or a site visit. It is a **PWA** (Add to Home Screen) — not an App Store or Play Store listing.

## At a glance

| Role | What you do |
| :-- | :-- |
| **Sales** | On **Project detail**, open **Install Hub on this visit**. You can copy the script and WhatsApp the link. You cannot create Hub accounts or map inverter plants. |
| **Operations / Admin** | Same script, plus **Create Hub account**, plant mapping, and (Admin) password reset / credentials PDF. Staff work lives under **Solar Hub** in the menu. |

→ [Projects](#projects-module) · [Solar Hub plants and generation](#solar-hub-plants-and-generation) · [Solar Hub staff lists](#solar-hub-staff-lists)

## Solar Hub staff lists

**Solar Hub** in the CRM menu has tabs: **Users**, **Maintenance**, **Provisioning**, and **Help Content**. Tabs use large touch targets and scroll sideways on narrow phones (they do not wrap to two rows).

### Start here

On first visit (until you dismiss it), a **Start here** strip orders the job:

1. **Provisioning** — create Hub logins for confirmed / install / completed gaps  
2. **Unlinked users** — Users list filtered to accounts with no Solis/Deye plant  
3. **Install Hub script** — jumps to the compact handover script on Users  

Dismiss stores a preference in this browser only (not synced across devices).

### Users

- **Phones (under ~744px):** **cards** by default — `@username`, customer, plant (Solis / Deye / **Unlinked**), quiet Active/Inactive, last login. **Tap the whole card** to open user detail. Optional **Cards / Table** toggle is remembered for the session.
- **Wider screens:** sortable table; row tap opens detail.
- **Quick views** — one-tap presets: Unlinked plants, Inactive, Never logged in, Solis linked, Deye linked.
- **Filters** — search, Active/Inactive, inverter brand, cloud plant, never logged in, sort. **Clear All** appears only when something is applied. Sort does not inflate the **Show Filters (N)** count.
- **How to read this list** — short plant legend (Solis / Deye / Unlinked).
- **Install Hub script** — collapsed by default on the Users list so accounts stay above the fold; expand when you need the visit script. Full script stays open on **user detail** and **Provisioning**.

User detail stays under the **Solar Hub** tabs (Users stays highlighted). After **password reset**, a **New credentials** panel stays on screen until you dismiss it (do not rely on toasts alone on phone).

### Maintenance

Service requests from the Hub app. On phones, use **cards** with large status actions. Links to Hub users use the Users search (`?q=`).

### Provisioning

Projects that still need a Hub login. On phones, use **cards** with provision actions. After you **Provision** one account, a **persistent credentials panel** shows the one-time password — copy it before dismissing. Bulk provision still summarizes counts; open the user to reset password if you need credentials again.

## On the visit

1. Open the **project** in CRM. Confirm a Hub **username** exists.
2. If **Last login** is Never, Admin resets a one-time password. Do not paste it into a group chat.
3. On **their** phone:
   - **Android:** Chrome → Hub URL → sign in with **username** (not email) → keep **Stay signed in** → Add to Home Screen.
   - **iPhone:** Safari → Share → **Add to Home Screen**.
4. Close the browser. Open the **Rayenna Solar Hub** icon. Show **Home**, **Track**, and **Support**.

Do **not** use WhatsApp’s in-app browser, and do **not** log them into Rayenna CRM.

The numbered script, **Copy script**, and **WhatsApp (no password)** live on:

- Project detail → **Rayenna Solar Hub** card
- **Solar Hub** → Users / user detail / Provisioning

## Notify from CRM

On **Solar Hub → user detail**, Ops/Admin can send a template (cleaning due, service, ticket update, or custom) to:

- **Hub bell** (in-app)
- **Web Push** if the homeowner allowed alerts on an installed Hub
- **WhatsApp** — without Cloud API this opens a **draft on your phone** (`wa.me`). With `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and approved `WHATSAPP_TEMPLATE_HUB_ALERT` (two body variables: title, body), the API sends it.

Do **not** put Hub passwords in these templates. Ticket/service events also Web-Push automatically when the device is subscribed.

---

# Solar Hub plants and generation

Hub **Home** and **Track** show monthly generation. After Ops/Admin map a plant, mapped months use **live kWh from the inverter cloud**. Unmapped months still use expected Kerala typicals. Self-use, export, and rupee savings are **typical splits — never the KSEB bill**. Export on a bill is not total generation — do not type KSEB figures into Hub.

## One cloud per project

A project can be linked to **SolisCloud** or **Deye Cloud**, not both. Unlink the current plant before switching clouds. Other monitoring portals (including Solarman) are **not** connected to Hub yet.

Match the cloud to the inverter the customer actually uses. Deye Cloud and Solarman are different systems even when the hardware looks similar.

## Map a plant (Operations / Admin)

1. Open **Solar Hub → Users** → the homeowner (card or table).
2. Use **SolisCloud plant** or **Deye Cloud plant**.
3. Pick the plant from the list (or paste the plant id). **Save** also pulls kWh once.
4. Confirm the status line shows months synced. Hub **Home** / **Track** then show a **Live · SolisCloud** or **Live · Deye Cloud** pill.

Map by the Hub **username** and the customer you have open — not by an old spreadsheet row number. If Save says the plant is already on another project, unlink it there first (the message includes **#SL** and username).

**Pull kWh** is optional: use it when you want the latest numbers **now**. The API also refreshes mapped plants about every **six hours**. You do not need to click Pull every day.

If a card says keys are not on the CRM API, that is an environment setup issue on the **API** service (not the Hub website). Redeploy the API after keys are added. Do not put cloud secrets in chat or git.

## What homeowners see

- **Live months** — inverter monthly total from the mapped cloud.
- **Expected months** — typical Kerala curve until a live month exists.
- **Manual kWh** — still available if Rayenna asks them to correct a month. They should use the inverter screen or plant app, **not** the KSEB bill.

## Accounts (Provisioning)

Hub accounts are created from **Confirmed** through completion (**Ops/Admin**). **Solar Hub → Provisioning** lists projects that still need an account. **Provision** creates the username and shows a **one-time password once** in the on-page credentials panel — there is no shared default password. Share it only with the household, then they change it in Hub **Profile**.

## Homeowner Help Center

Homeowners read guides and FAQs inside Hub → **Help**. Ops/Admin edit that content under **Solar Hub → Help**. After CRM API deploys that change the default FAQs, **Admin** can **Reimport** repo defaults so published Hub Help matches this product (live Solis/Deye months, KSEB vs Track).
