# Fix 404 on /projects, /dashboard, etc. (Render frontend)

If **https://rayenna-crm-frontend.onrender.com/projects** (or any route like `/dashboard`, `/help`) returns **404**, the static site is not configured for SPA routing.

## Fix (about 1 minute)

1. Go to **[Render Dashboard](https://dashboard.render.com)**.
2. Click your **frontend static site** (e.g. **rayenna-crm-frontend**).
3. In the left sidebar, open **Redirects/Rewrites** (or **Settings** → **Redirects/Rewrites**).
4. Click **Add Rule** (or **Add Redirect/Rewrite**).
5. Set:
   - **Type:** **Rewrite**
   - **Source:** `/*`
   - **Destination:** `/index.html`
6. Click **Save**.

No redeploy needed. After saving, open **https://rayenna-crm-frontend.onrender.com/projects** again; it should load the app and show the Projects page.
