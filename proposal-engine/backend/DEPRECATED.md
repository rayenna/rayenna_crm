# Deprecated — do not use for production or local dev

This folder was an early **standalone** Proposal Engine API (Express + **SQLite** on port **5001**).

**Production and local development today:**

- **API:** Rayenna CRM backend at repo root (`npm run dev` → port **3000**)
- **Routes:** `/api/proposal-engine/*`, `/api/roof/*`
- **Database:** Neon PostgreSQL (`prisma/schema.prisma` at repo root)

The PE UI in `proposal-engine/frontend` proxies to port 3000 and does not call this backend.

## If you see old instructions

Ignore any doc that says:

- `cd proposal-engine/backend && npm run dev`
- SQLite `dev.db` for proposals
- `GET http://localhost:5001/health` with `"module": "proposal-engine"`

Use **[../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)** and **[../README.md](../README.md)** instead.

## Removal

This directory may be deleted in a future cleanup PR once we confirm no scripts or CI reference it. Until then it remains as historical reference only.
