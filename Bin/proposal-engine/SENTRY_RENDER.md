# Sentry for Proposal Engine (Render)

The Proposal Engine frontend sends errors and performance data to Sentry when `VITE_SENTRY_DSN` is set.

## Set the environment variable on Render

1. Open [Render Dashboard](https://dashboard.render.com) and select the **rayenna-proposal-engine** (Proposal Engine Static Site) service.
2. Go to **Environment** (left sidebar).
3. Add a new variable:
   - **Key:** `VITE_SENTRY_DSN`
   - **Value:** your DSN from the Sentry project **rayennape-frontend** (e.g. `https://xxxx@o0.ingest.sentry.io/xxxx`).
4. Save. Redeploy the service so the new env is picked up (Render will use it on the next build).

**Important:** `VITE_*` variables are baked into the frontend at **build time**. After adding or changing `VITE_SENTRY_DSN`, trigger a new deploy (e.g. **Manual Deploy** → **Deploy latest commit**) so the build runs again with the new value.

## What gets captured

- React render errors (via the ErrorBoundary)
- Unhandled exceptions and uncaught promise rejections
- Runtime errors
- Performance traces (BrowserTracing, `tracesSampleRate: 1.0`)

All events are tagged with `module: proposal-engine` and use release `proposal-engine@1.0.0`.

## Test that Sentry works

- **In development:** Set `VITE_SENTRY_DSN` in `.env.local`, run the app, open the browser console, and run:
  ```js
  __triggerSentryTestError()
  ```
  A test error will be sent to Sentry.
- **In production:** Trigger the same from the console on the deployed site, or cause a real error (e.g. navigate to a broken state) and confirm the event appears in the Sentry project **rayennape-frontend**.
