# Render backend: not waking or stuck “Starting”

If the backend has been “not waking” or stuck in **Starting** for many minutes (e.g. ~15 mins), use this checklist. The backend is the **Web Service** (e.g. `rayenna-crm.onrender.com`), not the static frontend.

---

## 1. Check Render dashboard (do this first)

1. Go to [dashboard.render.com](https://dashboard.render.com) → your **backend Web Service** (not the static site).
2. **Status**
   - **Starting** for a long time → often means health check is failing or startup is too slow (see below).
   - **Failed** or **Suspended** → check **Events** and **Logs**.
3. **Logs** (same service → Logs)
   - Look for **crash** messages (e.g. `JWT_SECRET is not set`, `DATABASE_URL`, `Error: …`, `ECONNREFUSED`).
   - If the process exits and restarts repeatedly, Render will keep trying; fix the crash (env vars, DB URL, etc.).
4. **Settings** → **Health Check Path**
   - Must be exactly: **`/health`** (no leading slash typo, not `/api/health`).
   - Our app responds with `200` on `GET /health` before any other middleware. If the path is wrong, Render will get 404 and consider the service unhealthy.

---

## 2. Why “15 minutes” and what Render does

- **Health check:** Render sends `GET /health` to your service. The response must be **2xx or 3xx within 5 seconds**. If it doesn’t respond in time or returns an error, Render treats the instance as unhealthy.
- **During deploy:** If the **new** instance never passes health check for **15 consecutive minutes**, Render **cancels the deploy** and keeps the old instance (or shows failure). So “nearly 15 mins” can mean the new deploy is about to be marked failed because it never passed the 5s health check.
- **After idle (free tier):** The service spins down after ~15 minutes of no traffic. The **first** request after that triggers a cold start; wake-up usually takes **~30–90 seconds**. If it’s been 15+ minutes of you trying and it still doesn’t respond, that’s usually not “slow wake-up” but either a **crash on startup** or **health check never passing**.

---

## 3. Immediate checks

| Check | Action |
|-------|--------|
| **Health path** | Settings → Health Check Path = **`/health`**. Save and redeploy if you changed it. |
| **Env vars** | Ensure **JWT_SECRET** and **DATABASE_URL** are set (and correct). Missing/invalid values can make the process throw on startup. |
| **Manual test** | When the service shows “Live”, open `https://YOUR-BACKEND.onrender.com/health` in a browser. You should see `{"status":"ok","timestamp":"…"}`. If you get timeout or error, the service isn’t responding. |
| **Render status** | Check [status.render.com](https://status.render.com) for incidents. |
| **Start command** | Usually `npm start` or `node dist/server.js`. Ensure it matches how you run the app locally and that the build step produced `dist/`. |

---

## 4. If startup is slow (>5 seconds)

Render’s health check has a **5-second response timeout**. If your server doesn’t respond to `GET /health` within 5 seconds, the check fails. In this codebase, the server now calls **`listen()` before loading Prisma and route modules**, so `GET /health` can respond in 1–2 seconds. Route loading happens right after listen (so the app may return 503 “Service starting up” for a few seconds for non-health requests; that’s expected). If you still see slow or failed health checks:

- Keep **Health Check Path** = `/health` (the endpoint doesn’t touch the DB).
- Ensure no **synchronous** work (e.g. DB or file access) runs **before** `app.listen()` in `src/server.ts`.
- Check Render logs for “Server running on port” followed by “API routes ready” within a few seconds.

---

## 5. Reduce “not waking” (free tier spin-down)

- Use **Uptime Robot** (or similar) to ping `https://YOUR-BACKEND.onrender.com/health` every **5 minutes**. That keeps the service from spinning down so often. See `UPTIME_ROBOT_SETUP.md`.
- After spin-down, the first request can take **30–90 seconds**; the frontend is already set to show a friendly “server may be waking up” message on timeout.

---

## 6. Summary

- **Stuck “Starting” for ~15 mins** → Check **Logs** for crashes and **Settings** → Health Check Path = **`/health`**. Fix env vars or path, then redeploy.
- **Works sometimes, then stops** → Free tier spin-down; use a 5-minute ping to keep it warm, or check logs for crashes after idle.
- **2xx within 5 seconds** on **`/health`** is required for Render to mark the service healthy and finish the deploy.
