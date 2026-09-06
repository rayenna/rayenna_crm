# Solar Hub handover

Install **Rayenna Solar Hub** on the homeowner’s phone at handover or a site visit. It is a **PWA** (Add to Home Screen) — not an App Store or Play Store listing.

## At a glance

| Role | What you do |
| :-- | :-- |
| **Sales** | On **Project detail**, open **Install Hub on this visit**. You can copy the script and WhatsApp the link. You cannot create Hub accounts. |
| **Operations / Admin** | Same script, plus **Create Hub account** and (Admin) password reset / credentials PDF. |

→ [Projects](#projects-module)

## On the visit

1. Open the **project** in CRM. Confirm a Hub **username** exists.
2. If **Last login** is Never, Admin resets a one-time password. Do not paste it into a group chat.
3. On **their** phone:
   - **Android:** Chrome → Hub URL → sign in with **username** (not email) → keep **Stay signed in** → Add to Home Screen.
   - **iPhone:** Safari → Share → **Add to Home Screen**.
4. Close the browser. Open the **Rayenna Solar Hub** icon. Show **Home** and **Support**.

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

## Related

- Hub accounts are created from **Confirmed** through completion (Ops/Admin).
- Help for homeowners is inside Hub → **Help Center**.
