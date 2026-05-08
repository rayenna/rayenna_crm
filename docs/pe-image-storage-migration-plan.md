# Proposal Engine — Image Storage Migration Plan

**Status:** Monitoring — no action needed yet  
**Last reviewed:** May 2026  
**Owner:** Engineering

---

## Background

The Proposal Engine custom sections rich-text editor (`CustomSectionsBeforeBoq.tsx`) allows users to embed images directly into proposal content. These images are compressed to JPEG base64 data URLs and saved as part of the proposal HTML in the `pe_proposals` database table (Neon PostgreSQL).

This is **different** from CRM project documents, which already upload to Cloudinary and store only a URL.

### Current storage profile (May 2026)

| Metric | Value |
|---|---|
| Proposals in DB | 32 |
| `pe_proposals` TOAST size | ~2 MB |
| Average per proposal (with images) | ~64 KB |
| Total Neon DB size | ~85 MB (includes WAL overhead) |
| Actual user data (all tables) | ~11 MB |

---

## Growth projection

| Proposals | Estimated `pe_proposals` TOAST | Action |
|---|---|---|
| 32 (today) | ~2 MB | ✅ Monitor |
| 100 | ~6 MB | ✅ Monitor |
| **200** | **~13 MB** | ⚠️ **Begin planning migration** |
| **500** | **~32 MB** | 🔴 **Complete migration before this** |
| 1,000 | ~64 MB | ❌ Unacceptable — DB will slow |

---

## Trigger: when to act

Run this query in the Neon SQL Editor periodically (or set a reminder):

```sql
SELECT
  pg_size_pretty(pg_relation_size(t.oid)) AS pe_proposals_blob_size,
  COUNT(*)                                 AS proposal_count
FROM pg_class c
JOIN pg_class t ON c.reltoastrelid = t.oid
CROSS JOIN (SELECT COUNT(*) FROM pe_proposals) p
WHERE c.relname = 'pe_proposals'
GROUP BY t.oid;
```

| Result | Action |
|---|---|
| TOAST < 10 MB | Do nothing |
| TOAST 10–20 MB | Start Cloudinary migration sprint |
| TOAST > 20 MB | Stop adding image features until migrated |

---

## What the migration involves

### Goal
Instead of saving `data:image/jpeg;base64,....` in the proposal HTML, upload the image to Cloudinary and save the Cloudinary URL (`https://res.cloudinary.com/...`) instead.

### Files to change

| File | Change |
|---|---|
| `proposal-engine/frontend/src/components/CustomSectionsBeforeBoq.tsx` | Replace `compressImageFileToDataUrl()` with an upload-to-Cloudinary call; insert returned URL as `<img src="...">` |
| `src/routes/documents.ts` or a new `proposal-engine/backend/routes/peImages.ts` | Add a `POST /api/proposal-engine/upload-image` endpoint that receives the file, uploads to Cloudinary under a `pe-images/` folder, and returns the URL |

### Cloudinary is already configured for
- CRM project documents (`src/routes/documents.ts`)
- Roof layout AI images (`src/routes/roofLayout.ts`)

The same `CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET` env vars already in Render will work. No new account or credentials needed.

### Existing proposals
Images already stored as base64 in existing proposals will **not** be migrated automatically. They will continue to work (the `<img src="data:...">` tags remain valid). Only new uploads after the migration go to Cloudinary. A one-time backfill script can be written later if needed.

---

## Reminder schedule

| Date | Action |
|---|---|
| **Aug 2026** | Run the monitoring query. If TOAST < 10 MB, do nothing. |
| **Nov 2026** | Run again. If > 10 MB, schedule migration sprint. |
| **Feb 2027** | If not yet migrated and TOAST > 15 MB, treat as P1. |

---

## Why not do it now?

- Only 32 proposals exist — migration effort is not justified yet
- The existing base64 compression (560K char target ≈ 420 KB decoded) keeps per-image sizes reasonable
- Cloudinary free tier (25 GB) gives ample runway — no cost pressure
- Migrating the upload flow in the rich-text editor requires careful testing (Android Chrome, image insertion, sanitisation)

---

## Notes

- The Cloudinary warning `⚠️ Cloudinary not configured` in local dev logs is expected — the local machine has no `.env` file with the credentials. Production (Render) is correctly configured.
- Neon WAL files account for the bulk of the 85 MB total DB size. WAL recycles automatically over days after heavy migration activity. It is not a sign of data bloat.
