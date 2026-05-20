# Proposal Engine — smoke checklist

Use after PE frontend and/or CRM API deploys, or before merging large PE PRs.  
**Local:** API on `http://localhost:3000`, PE on `http://localhost:5174`.

## Auth & entry

- [ ] Login with CRM credentials on PE `/login`
- [ ] SSO from CRM (`?ticket=`) lands on PE with session (no redirect loop)
- [ ] Logout / new tab: session cleared when expected (`sessionStorage`)

## Project list

- [ ] `/customers` loads projects from API (not empty for test user)
- [ ] Select/open a CRM-linked project → workspace opens
- [ ] Hidden-project behaviour (if used) does not hide server-backed projects incorrectly

## Costing → BOM → ROI

- [ ] Costing: edit lines, save → no sync-error toast → refresh page → data still present
- [ ] Costing: margin accepts decimals (e.g. 3.75) and saves correctly
- [ ] BOM: save → reload project from list → BOM intact
- [ ] ROI: save → reload → ROI intact
- [ ] Open project from Customers → Dashboard shows green **Up to date** banner (server refresh)
- [ ] Second browser (or incognito) same user: open same project → sees saved artifacts (not only local WIP)

## Proposal

- [ ] Generate proposal from saved costing/BOM/ROI
- [ ] Save proposal → `pe_proposals` reflected (reopen project)
- [ ] Export DOCX/PDF downloads without console errors
- [ ] Optional: create share link → open `/view/:token` (password if set)

## AI roof layout

- [ ] Regenerate layout for project with CRM lat/lng
- [ ] Override Google Maps URL (full URL or `lat, lng`) → regenerate → satellite image changes
- [ ] Edit polygon / keepouts → Save to proposal → reopen `/ai-layout` → geometry restored
- [ ] Proposal embed shows layout image when enabled

## Roles (spot-check one role you care about)

- [ ] Sales: only assigned projects editable
- [ ] Admin/Ops: read or edit per your policy

## Production-only (after Render deploy)

- [ ] `GET {API}/health` returns OK
- [ ] PE `VITE_API_BASE_URL` points at live API
- [ ] Cold start: first login within ~90s (health pre-warm if applicable)

---

*Failures: note project id, user role, browser, and whether data existed only in localStorage WIP vs after Save.*
