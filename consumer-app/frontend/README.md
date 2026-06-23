# Rayenna Solar Hub (consumer PWA)

Mobile-first customer app for homeowners — energy tracking, maintenance, support, and profile. Shares the **Rayenna CRM API** on Render (`/api/consumer/*`).

## Local development

| Service | URL | Command |
|---------|-----|---------|
| **API** (required) | http://localhost:3000 | Repo root: `npm run dev:server` |
| **Solar Hub** | http://localhost:5175 | `cd consumer-app/frontend && npm run dev` |

### Setup

```bash
cd consumer-app/frontend
npm install
```

Root `.env` must include:

```bash
CONSUMER_JWT_SECRET=<long-random-string>   # separate from JWT_SECRET
```

Optional demo user:

```bash
ALLOW_CONSUMER_AUTO_SEED=1 npm run prisma:seed:consumer
# username: hub.demo / password: hubdemo123
```

Auto-provisioned production accounts use **username + password** (`rayenna123` default) when a project reaches **Completed** or **Completed–Subsidy Credited**. Backfill existing completed projects:

```bash
npm run prisma:backfill:consumer-hub
```

Do **not** set `VITE_API_BASE_URL` locally — Vite proxies `/api` to port 3000.

## Build

```bash
npm run build
```

Produces `dist/` and `dist/404.html` (SPA fallback for Render).

## Environment variables (production)

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_API_BASE_URL` | Render / Vercel **static** service | CRM API base, e.g. `https://rayenna-crm.onrender.com` |
| `CONSUMER_JWT_SECRET` | Render **API** service only | Consumer JWT signing (not on the static site) |

## Deploy — Render

`render.yaml` includes static service **`rayenna-solar-hub`** (`rootDir: consumer-app/frontend`).

1. Merge to `main` and sync Blueprint on Render (or create static site manually with same settings).
2. Set `VITE_API_BASE_URL` on the **Solar Hub** static service.
3. Set `CONSUMER_JWT_SECRET` on the **rayenna_crm API** service (if not already set).
4. Redeploy **API** after CORS/env changes.
5. URL: `https://rayenna-solar-hub.onrender.com`

## Deploy — Vercel (optional parallel)

1. New Vercel project, **Root Directory** = `consumer-app/frontend`.
2. `VITE_API_BASE_URL` = same API URL as Render.
3. Uses `consumer-app/frontend/vercel.json`.
4. `*.vercel.app` origins are allowed by API CORS.

## PWA

- `public/manifest.json` — installable app metadata
- `vite-plugin-pwa` — service worker, auto-update, SPA offline shell
- Install via browser **Add to Home Screen** (mobile) after HTTPS deploy

## Stack

React 19 · Vite · TypeScript · Tailwind · TanStack Query · Recharts · Zenith theme tokens
