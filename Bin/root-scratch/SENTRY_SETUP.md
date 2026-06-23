# Sentry error tracking

Error tracking is wired for **rayenna-backend** (Node) and **rayenna-frontend** (React). It only runs when the DSN is set.

## Environment variables

**Backend (root `.env`):**
```env
SENTRY_DSN=https://…@…ingest.sentry.io/…   # from Sentry project: rayenna-backend
```

**Frontend (`client/.env` or `client/.env.local`):**
```env
VITE_SENTRY_DSN=https://…@…ingest.sentry.io/…   # from Sentry project: rayenna-frontend
```

- Do **not** commit DSNs. They are in `.gitignore`.
- In production (Render/Vercel), set the same variables in the host's environment.

## After adding DSNs

1. **Install frontend dependency** (if not already):  
   `cd client && npm install`
2. **Run app:** Backend and frontend will send errors to Sentry when DSNs are set. Without DSNs, nothing is sent.

## What is captured

- **Backend:** Unhandled Express errors and unhandled promise rejections.
- **Frontend:** Uncaught JS errors and React component errors (via Error Boundary).

Events appear in your Sentry dashboard under the two projects (rayenna-backend, rayenna-frontend).

## Sensitive data scrubbing

Both backend and frontend use a **beforeSend** scrubber so passwords, tokens, and credit card–like data are never sent to Sentry:

- **Keys redacted:** `password`, `token`, `authorization`, `apiKey`, `creditCard`, `cvv`, `secret`, and similar (including in nested objects and breadcrumbs).
- **Patterns redacted:** Credit card–like digit sequences and JWT-like strings in messages and strings.

Scrubbing runs in app code only; no Render or Sentry dashboard config is required.
