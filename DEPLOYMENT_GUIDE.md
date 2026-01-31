# Rayenna CRM - Cloud Deployment Guide

This guide covers deploying the Rayenna CRM to cloud platforms while maintaining full local development functionality.

## ✅ Current State Preserved

All local development features remain intact:
- Local frontend: `http://localhost:5173`
- Local backend: `http://localhost:3000`
- Local PostgreSQL database
- File uploads to local `uploads/` directory

## 📁 Project Structure

```
rayenna-crm/
├── client/              # Frontend (React + Vite)
│   ├── src/
│   ├── vite.config.ts
│   ├── vercel.json      # Vercel configuration
│   └── package.json
├── src/                 # Backend (Express + TypeScript)
│   ├── routes/
│   ├── server.ts
│   └── ...
├── prisma/
│   └── schema.prisma
└── package.json
```

## 🌐 Cloud Platform Setup

### 1. Neon Database (PostgreSQL)

1. **Sign up/Login**: https://neon.tech (rayennasolar@gmail.com)
2. **Create Project**: 
   - Click "New Project"
   - Name: `rayenna-crm-prod`
   - Region: Choose closest to your users
3. **Get Connection String**:
   - Go to Project Dashboard
   - Click "Connection Details"
   - Copy "Connection string" (looks like: `postgresql://user:pass@host/db?sslmode=require`)
4. **Save connection string** - you'll need it for Render deployment

---

### 2. Cloudinary (File Storage)

1. **Sign up/Login**: https://cloudinary.com (rayennasolar@gmail.com)
2. **Get Credentials**:
   - Go to Dashboard
   - Copy:
     - Cloud Name
     - API Key
     - API Secret
3. **Save credentials** - you'll need them for Render deployment

---

### 3. Render (Backend Deployment)

1. **Sign up/Login**: https://render.com (rayennasolar@gmail.com)
2. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `rayenna/rayenna_crm`
   - Configure:
     - **Name**: `rayenna-crm-backend`
     - **Region**: Choose closest to Neon database
     - **Branch**: `main` (or your deployment branch)
     - **Root Directory**: `/` (root of repo)
     - **Runtime**: `Node`
     - **Build Command**: 
       ```bash
       npm install && npx prisma generate && npm run build:server
       ```
     - **Start Command**: 
       ```bash
       npm run start
     - **Instance Type**: Free
3. **Environment Variables** (in Render Dashboard):
   ```
   DATABASE_URL=<Your Neon connection string>
   JWT_SECRET=<Generate a secure random string>
   NODE_ENV=production
   PORT=10000
   MAX_FILE_SIZE=26214400
   CLOUDINARY_CLOUD_NAME=<Your Cloudinary Cloud Name>
   CLOUDINARY_API_KEY=<Your Cloudinary API Key>
   CLOUDINARY_API_SECRET=<Your Cloudinary API Secret>
   OPENAI_API_KEY=<Your OpenAI key if using AI features>
   FRONTEND_URL=<Your Vercel frontend URL - set after Vercel deployment>
   ```
   DATABASE_URL=psql 'postgresql://neondb_owner:npg_YBTlVfenu2k7@ep-twilight-water-a1ahtaf4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
   JWT_SECRET=9c25dc50ac733514ca93cede8399df7673543e863d52344e4bb9ce4e978ea82647b02dead25305d8ed283bfd5cce599a27485741c68fd89e6b26ce08457ab517
   NODE_ENV=production
   PORT=10000
   MAX_FILE_SIZE=26214400
   CLOUDINARY_CLOUD_NAME=dwmwc2nzf
   CLOUDINARY_API_KEY=998311513464496
   CLOUDINARY_API_SECRET=efzCoLtJzYcRJJWlEJq36zOsUb4
   OPENAI_API_KEY=<Your OpenAI API Key - get from https://platform.openai.com/api-keys>
   FRONTEND_URL=<Your Vercel frontend URL - set after Vercel deployment>

4. **Save Web Service** - Render will start building
5. **Get Backend URL**: After deployment, note your service URL (e.g., `https://rayenna-crm-backend.onrender.com`)

---

### 4. Vercel (Frontend Deployment)

1. **Sign up/Login**: https://vercel.com (rayennasolar@gmail.com)
2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import from GitHub: `rayenna/rayenna_crm`
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `client`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`
3. **Environment Variables** (in Vercel Dashboard):
   ```
   VITE_API_BASE_URL=https://rayenna-crm-backend.onrender.com
   ```
   (Use the Render backend URL from step 3)
4. **Deploy** - Vercel will build and deploy
5. **Get Frontend URL**: Note your Vercel URL (e.g., `https://rayenna-crm.vercel.app` or `https://rayenna-crm-kappa.vercel.app`)
6. **Update Render Environment Variable**:
   - Go back to Render dashboard
   - Update `FRONTEND_URL` to your Vercel URL
   - Render will automatically restart with new CORS settings

#### Where to see (and change) Root Directory in Vercel

If Vercel is **not auto-deploying** after Git push, the cause is often a **Root Directory** mismatch. Fix it in the Vercel UI (not in GitHub):

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your **frontend project** (e.g. the one at `rayenna-crm-kappa.vercel.app`)
3. Click **Settings** (top menu)
4. Open **General**
5. Scroll to **Build & Development Settings**
6. Find **Root Directory**

**What you’ll see:**  
`Root Directory: /` **or** `Root Directory: client`

**What it must be for this repo (frontend in `client/`):**

| Root Directory | Use when |
|----------------|----------|
| **`client`**   | Frontend lives in `client/` (this repo) ✅ |
| **`/`**        | Frontend at repo root (not this repo) |

➡️ **Set Root Directory to `client`**, then **Save**.

**After changing Root Directory:**

1. Go to **Deployments**
2. Click **Redeploy** on the latest deployment
3. Choose **Redeploy without cache**
4. Your latest Git push should deploy correctly.

**Sanity check in build logs:**  
You should see something like:

```text
Running "npm run build" in /vercel/path0/client
```

If you see `/client` in the path, the Root Directory is correct.

---

## 🔧 Local Development Setup

### Frontend Environment (.env.local)

Create `client/.env.local`:
```env
# Leave empty for local development (uses Vite proxy)
VITE_API_BASE_URL=
```

### Backend Environment (.env)

Create `.env` in root:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rayenna_crm?schema=public"

# JWT Authentication
JWT_SECRET="your-local-dev-secret"

# Server Port
PORT=3000

# Environment
NODE_ENV=development

# File Upload Settings
MAX_FILE_SIZE=26214400

# Cloudinary (Optional - leave empty for local file storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# OpenAI API (Optional)
OPENAI_API_KEY=

# Frontend URL (not needed for local dev)
FRONTEND_URL=
```

**Important**: These files are gitignored. Never commit actual secrets!

---

## 🚀 Local Development Commands

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Run Prisma migrations
npm run prisma:generate
npm run prisma:migrate

# Start development servers
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

---

## 🔄 How Environment Switching Works

### Frontend

- **Local**: `VITE_API_BASE_URL` empty → Uses Vite proxy to `localhost:3000`
- **Production**: `VITE_API_BASE_URL` set → Makes requests to Render backend

### Backend

- **Local**: Uses local PostgreSQL from `DATABASE_URL`
- **Production**: Uses Neon PostgreSQL from `DATABASE_URL`
- **File Storage**: 
  - Cloudinary configured → Uses Cloudinary
  - Cloudinary not configured → Uses local `uploads/` directory

### CORS

- **Local**: Allows `http://localhost:5173` and development mode allows all origins
- **Production**: Allows only `FRONTEND_URL` from environment

---

## ✅ Post-Deployment Verification

1. **Frontend**:
   - Visit Vercel URL
   - Login should work
   - All pages should load

2. **Backend**:
   - Visit `https://your-backend.onrender.com/health`
   - Should return `{"status":"ok","timestamp":"..."}`

3. **Database**:
   - Try creating a customer/project
   - Data should persist

4. **File Uploads**:
   - Upload a document in a project
   - File should upload to Cloudinary
   - File should be viewable/downloadable

---

## 🔒 Security Checklist

- [x] JWT_SECRET is strong and unique in production
- [x] DATABASE_URL uses SSL (Neon includes this)
- [x] CORS only allows production frontend URL
- [x] Environment variables never committed to Git
- [x] Cloudinary credentials secured

---

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_BASE_URL` in Vercel (or Render static site) environment variables
- Verify backend URL is correct (with `https://`, no trailing slash)
- Check browser console for CORS errors

### Render frontend: Cannot log in / password not working for any user

**Symptom:** Login form always fails (“Invalid credentials” or “Login failed”) even with correct passwords.

**Cause:** The frontend is not calling the **backend** API. It uses `VITE_API_BASE_URL` to know where the API lives. That value is **baked in at build time**. If it’s missing or was added **after** the first deploy, the app calls the wrong URL (or relative `/api/...` against the static site) and login fails.

**Fix:**

1. **Render Dashboard** → your **Static Site** (e.g. `rayenna-crm-frontend`) → **Environment**
2. Add **`VITE_API_BASE_URL`** = `https://rayenna-crm-backend.onrender.com`  
   - Use your actual backend URL; no trailing slash.
3. **Redeploy** the static site (e.g. **Manual Deploy** → **Deploy latest commit**).  
   - A new build is required so the env var is included.
4. **Backend** → **Environment**: set **`FRONTEND_URL`** to your **Render frontend** URL (e.g. `https://rayenna-crm-frontend.onrender.com`) so CORS allows it. **Save** and let the backend restart.

**Check:** Open the frontend → DevTools → **Network**. Log in and look at the login request. It should go to `https://YOUR-BACKEND.onrender.com/api/auth/login`, not to the frontend URL. If it goes to the frontend host, `VITE_API_BASE_URL` is still wrong or missing — fix env and **redeploy** again.

**Use the exact backend URL from Render:** In Render Dashboard → your **backend** service → note the **primary URL** (e.g. `https://rayenna-crm.onrender.com`). It may *not* be `rayenna-crm-backend.onrender.com`. Set `VITE_API_BASE_URL` to that **exact** URL. Wrong URL → 404 + CORS errors.

---

**Still can't log in? Debug checklist**

1. **Login page shows “API not configured” banner**  
   → `VITE_API_BASE_URL` is missing. Add it in Render (Static Site → Environment), then **Manual Deploy** → **Deploy latest commit**. Wait for **Live**, then hard-refresh the login page.

2. **Toast: “Cannot reach API. Set VITE_API_BASE_URL…”**  
   → Same as above. The request never hits the backend (wrong or empty API URL). Add env, **redeploy** the static site, then try again.

3. **Toast: “Invalid credentials”**  
   → The request **is** reaching the backend. Check email/password. If correct, check backend logs (Render → backend → Logs) for DB or auth errors.

4. **DevTools → Console:** `[Rayenna CRM] VITE_API_BASE_URL is not set`  
   → Env not in build. Add `VITE_API_BASE_URL` on the static site, **redeploy**, then hard-refresh (Ctrl+Shift+R).

5. **DevTools → Network:** login request goes to **frontend** URL (e.g. `...-frontend.onrender.com/...`)  
   → API base wrong or missing. Fix env, **redeploy**, clear cache / hard-refresh.

6. **DevTools → Network:** login request goes to **backend** URL but **red** (CORS or 4xx/5xx)  
   - **CORS error:** Set **FRONTEND_URL** on the **backend** to the exact frontend URL (e.g. `https://...-frontend.onrender.com`), **Save**, wait for restart.  
   - **401:** Invalid email/password (or user missing in DB).  
   - **5xx:** Check backend **Logs** on Render.

7. **Backend reachable?** Open `https://YOUR-BACKEND.onrender.com/api/health` in a browser. You should see `{"status":"ok",...}`. If not, the backend is down or wrong URL.

### Backend can't connect to database
- Verify `DATABASE_URL` in Render includes `?sslmode=require`
- Check Neon dashboard for connection limits
- Verify IP isn't blocked (Neon free tier may have restrictions)

### Migration deploy timeout errors (P1002)
- **Symptom**: `Error: P1002 - The database server was reached but timed out` during build
- **Cause**: Neon connection pooler doesn't support PostgreSQL advisory locks well
- **Solution**: The build script now includes automatic retry logic
- **Manual Fix**: 
  - Use Neon's direct connection string (not pooler) for migrations
  - In Neon dashboard, get connection string without `-pooler` suffix
  - Or wait a few minutes and redeploy (lock may have cleared)

### File uploads fail
- Check Cloudinary credentials in Render
- Verify Cloudinary free tier limits
- Check `MAX_FILE_SIZE` is appropriate

### CORS errors
- Verify `FRONTEND_URL` in Render matches Vercel URL exactly
- Check backend logs in Render dashboard
- Ensure `FRONTEND_URL` includes `https://`

### Vercel not deploying latest commit (Deployments show N-1)

**Symptom:** You push to `main`, but Vercel’s latest deployment is still the previous commit. Production Branch may be hard to find in the current Vercel UI.

---

#### ✅ **Recommended fix: Deploy Hooks (no Production Branch needed)**

Deploy Hooks let you **trigger a deploy on demand** from latest `main`. No Git webhook, no Production Branch required.

1. **Vercel Dashboard** → your project → **Settings** → **Git**
2. Scroll to **Deploy Hooks**
3. **Name**: e.g. `Deploy latest main`
4. **Branch to deploy**: select **`main`**
5. Click **Create Hook**
6. Copy the **hook URL** (looks like `https://api.vercel.com/v1/integrations/deploy/...`)

**Trigger a deploy:**

- **Browser:** Paste the hook URL in the address bar and press Enter (GET works).
- **PowerShell:**
  ```powershell
  Invoke-WebRequest -Uri "YOUR_HOOK_URL" -Method POST
  ```
- **curl:** `curl -X POST "YOUR_HOOK_URL"`

Each time you run it, Vercel builds and deploys the **latest commit on `main`**. Use this after every `git push origin main` when auto-deploy isn’t working.

---

#### Other options

**Disconnect and reconnect Git**

- **Settings** → **Git** → **Disconnect** → **Connect** same repo again, **Save**
- Then push a small change and check **Deployments**

**Production Branch** (if you find it)

- **Settings** → **Git** (or **Environments**). Look for **Production Branch** or **Git Branch**.
- Set to **`main`** and **Save**. Vercel’s UI changes; it may be under **Git Integration** or **Advanced**.

**Vercel CLI**

```bash
cd client
npx vercel --prod
```

Log in / link project if prompted. Deploys from your local `client/` folder.

---

#### No new deployment appears at all (only old build in Deployments)

**Symptom:** You trigger the Deploy Hook (or push to `main`), but **no new deployment** shows up — you only see the old build(s). The hook may return **201** with `"state":"PENDING"` but nothing appears in Deployments (even with **only one project**).

**Still stuck?** → Scroll to **🚨 STUCK: No new deployments ever — escape options** (Option A: new Vercel project; Option B: Render Static Site).

---

**▶ Reliable workaround: Deploy via Vercel CLI (bypasses Git & hooks)**

Deploy **from your local `client/` folder**. No GitHub, no Deploy Hook — just your current code.

**First time (login + link):**

1. `cd client`
2. `npx vercel login` — log in via browser if you see *"The specified token is not valid"*.
3. `npx vercel --prod` — **no** `--yes`. When asked **"Link to existing project?"** → **Y** → select your frontend project (e.g. rayenna-crm-kappa).

**After that:**

```bash
cd client
npm run deploy
```

A **new** deployment will appear in Deployments and update Production. Use this after each `git pull` or change when hooks aren't working.

---

**1. Confirm you're viewing the right project**

- Deploy Hooks live under **one specific Vercel project**: Settings → Git → Deploy Hooks.
- **Deployments** are per project. You must be on **that same project's** Deployments page.
- If you have multiple projects (e.g. `rayenna-crm`, `rayenna-crm-kappa`), ensure:
  - The Deploy Hook was created in the project you care about.
  - You're looking at **Deployments** for that exact project (check project name in the top-left or URL).

---

**2. Redeploy test (prove new deploys can appear)**

- Go to **Deployments** → click the **latest** (old) deployment.
- Click **Redeploy** (or ⋮ → Redeploy).
- Choose **Redeploy without cache** → confirm.
- Does a **new** deployment appear at the top?
  - **Yes** → The project accepts new deploys. The issue is Git/hooks (wrong project, wrong repo, or hook misconfigured).
  - **No** → Unusual; try another browser, clear cache, or check Vercel status.

---

**3. Use Vercel CLI — deploy from local (bypass Git entirely)**

This deploys **your local `client/` folder** to Vercel. It does **not** use GitHub, webhooks, or Deploy Hooks.

```bash
cd client
npx vercel --prod
```

- Log in or link the project if prompted. When asked "Link to existing project?", choose **Y** and select your frontend project (e.g. `rayenna-crm-kappa`).
- After it finishes, check **Deployments** — you should see a **new** deployment from "Vercel CLI".
- **Workaround:** After each `git pull` or local change, run `cd client && npx vercel --prod` to push the latest build. Your Production URL will update.

---

**4. Recreate the Deploy Hook**

- **Settings** → **Git** → **Deploy Hooks**.
- Delete the existing hook, then **Create Hook** again:
  - Name: e.g. `Deploy latest main`
  - Branch: **`main`**
- Trigger the **new** hook URL. Check **Deployments** for the **same project**.

---

**5. Check Git connection**

- **Settings** → **Git**. Is the repo connected? Try **Disconnect** → **Connect** same repo → **Save**.
- Push a small change, then trigger the Deploy Hook. See if a new deployment appears.

**6. Hook returns 201 (job PENDING) but no deployment — one project only**

- Deploy Hooks **require** the project to be connected to Git. If Git is disconnected or broken, the job can be created but no deployment is created.
- **Fix:** **Settings** → **Git** → **Disconnect** → **Connect** the same repo (`rayenna/rayenna_crm`) again → **Save**. Then trigger the hook again.
- Ensure **Root Directory** is **`client`** (Settings → General → Build & Development Settings).
- If it still doesn’t work, **use CLI deploy** (see workaround above): `cd client && npm run deploy`.

---

### 🚨 STUCK: No new deployments ever — escape options

If **nothing** creates new deployments (hook returns 201, Redeploy, CLI, one project only), use one of these to get unstuck.

---

#### Option A: New Vercel project (fresh start)

Create a **new** Vercel project from the same repo. Fresh Git link often fixes “no deployments” issues.

1. **Vercel Dashboard** → **Add New** → **Project**
2. **Import** `rayenna/rayenna_crm` from GitHub (same repo)
3. **Configure:**
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variable:** `VITE_API_BASE_URL` = `https://rayenna-crm-backend.onrender.com`
4. **Deploy.** Wait for the first build to finish.
5. **Note the new URL** (e.g. `https://rayenna-crm-xyz.vercel.app`)
6. **Render** → your backend service → **Environment** → set **FRONTEND_URL** to the **new** Vercel URL → **Save**
7. Use the new frontend URL. The old Vercel project can be ignored or deleted.

**Updates:** Push to `main` → new project should auto-deploy (or use its Deploy Hook).

---

#### Option B: Deploy frontend to Render (Static Site) — leave Vercel

Move the frontend **off Vercel** onto **Render** as a Static Site. Backend is already on Render.

**Repo ready:** `client/public/redirects` (SPA rewrites) is included and copied to `dist/` on build. Root `render.yaml` defines the static site for optional **Blueprint** use; you can also create the Static Site manually below.

**Step-by-step (manual):**

1. **Render Dashboard** → **New +** → **Static Site**
2. **Connect** `rayenna/rayenna_crm` (same repo as backend)
3. **Configure:**
   - **Name:** `rayenna-crm-frontend`
   - **Branch:** `main`
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Environment:** Add `VITE_API_BASE_URL` = `https://rayenna-crm-backend.onrender.com`  
     **Important:** This is baked in at build time. If you add or change it later, **redeploy** the static site (Manual Deploy → Deploy latest commit) or login/API will fail.
4. **SPA routing:** The build outputs `404.html` (copy of `index.html`). Render serves it for missing paths, so `/dashboard`, `/help`, etc. work on refresh. **No Redirects/Rewrites** in the Dashboard needed. (If that UI shows "Not Found", you can ignore it.)
5. **Create Static Site.** Wait for build.
6. **Note the URL** (e.g. `https://rayenna-crm-frontend.onrender.com`)
7. **Render** → backend service → **Environment** → **FRONTEND_URL** = new static site URL → **Save**
8. Backend CORS uses `FRONTEND_URL`; you’re set.

**Alternative:** Use **New + Blueprint** → connect repo → apply. The root `render.yaml` defines the static site only; add the Rewrite rule in Dashboard afterward.

**Updates:** Push to `main` → Render rebuilds the static site automatically (like the backend).

---

#### Render Static Site — Add env, redirects, redeploy (click-by-click)

**1. Add `VITE_API_BASE_URL` on the static site**

1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click your **static site** (e.g. `rayenna-crm-frontend`) in the list.
3. In the left sidebar, click **Environment**.
4. Under **Environment Variables**, click **Add Environment Variable** (or **+ Add**).
5. **Key:** `VITE_API_BASE_URL`  
   **Value:** `https://rayenna-crm-backend.onrender.com`  
   (Use your real backend URL; no trailing slash.)
6. Click **Save Changes**.

**2. Redeploy the static site** (required — the env var is baked in at build time)

**Adding the variable is not enough.** You must trigger a **new build** or it won’t be used.

1. Stay on the **static site** page.
2. Top-right: click **Manual Deploy** → **Deploy latest commit** (or **Clear build cache & deploy**).
3. Wait for the build to finish (status **Live**).
4. **Check:** Open the **login page** → scroll down. You should see **"API base (for login):"** with your backend URL. If it says **"NOT SET"**, the var wasn’t in the build — add it, **Save**, then **Manual Deploy** again.

**3. Set `FRONTEND_URL` on the backend**

1. In the Render Dashboard, click your **backend** service (e.g. `rayenna-crm-backend`).
2. Left sidebar → **Environment**.
3. Find **FRONTEND_URL**. If it exists, **Edit**; otherwise **Add Environment Variable**.
4. **Key:** `FRONTEND_URL`  
   **Value:** your **static site** URL, e.g. `https://rayenna-crm-frontend.onrender.com` (no trailing slash).
5. **Save Changes.** Render will restart the backend.

**4. SPA routing (direct URLs / refresh)** — **404.html workaround (no Redirects/Rewrites UI needed)**

The build now copies `index.html` → `404.html`. Render serves `404.html` for paths that don’t exist (e.g. `/dashboard`, `/help`), so the SPA loads and client-side routing works. **You do not need to configure Redirects/Rewrites in the Dashboard.**

If you see **"Not Found"** when opening **Redirects/Rewrites** (Dashboard → Static Site → Redirects/Rewrites), that’s fine — the **404.html** workaround replaces it. Just redeploy the static site so the new build (with `404.html`) is deployed.

**Required for /projects, /dashboard, etc. to work:**  
Left sidebar → **Redirects/Rewrites** (or **Settings** → **Redirects/Rewrites**). **Add Rule** → **Type:** Rewrite → **Source:** `/*` → **Destination:** `/index.html` → **Save.** Without this, direct URLs like `https://...onrender.com/projects` return 404.

Then open your frontend URL, try logging in, and check DevTools → Network that the login request goes to the **backend** URL.

---

#### Deploy Hook ran but site still not updating? Debug checklist

1. **Deployments** → find the **newest** deployment (top of list, created when you triggered the hook).
   - **Status**: Building / Ready / Error?
   - **Commit**: What commit does it show? Compare to `git log origin/main -1 --oneline` locally.

2. **If status is Error or Failed**
   - Click the deployment → **View Build Logs**.
   - Check for: Root Directory wrong, missing env vars, `npm run build` failure, Out of Memory, etc.
   - Fix the cause (e.g. Root Directory = `client`, env vars in Vercel), then trigger the hook again.

3. **If status is Ready**
   - Confirm the **commit** matches latest on `main`. If not, the hook may be deploying a different branch — recreate the hook and select **main**.
   - Open the **Production** URL (e.g. `https://rayenna-crm-kappa.vercel.app`), not a Preview URL.
   - **Hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac). Or try **Incognito/Private** window.
   - If it still looks old, try a different browser or device to rule out cache.

4. **Production vs Preview**
   - **Production** = the live site (main domain). Deploy Hook for `main` should update Production.
   - **Preview** = per-deployment URLs. Make sure you’re checking the **Production** deployment, not an old Preview.

5. **Trigger hook again after a new push**
   - `git push origin main` → wait a few seconds → trigger Deploy Hook URL → check Deployments for a **new** deployment with the **new** commit.

---

## 📝 Important Notes

1. **Local Development Always Works**: All changes preserve local functionality
2. **Environment Variables**: Never commit `.env` files - they're gitignored
3. **Database Migrations**: Run migrations on both local and production separately
4. **Free Tier Limitations**:
   - Render: Service spins down after inactivity (15-min cold start)
   - Neon: Connection limits, storage limits
   - Vercel: Build time limits
   - Cloudinary: Storage and bandwidth limits

---

## 🔄 Updating Deployed Application

1. **Make changes locally**
2. **Test locally**: `npm run dev`
3. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
4. **Automatic Deployment**:
   - Render: Automatically rebuilds on push
   - Vercel: Automatically rebuilds on push

---

## 📞 Support

For issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check Vercel logs: Dashboard → Your Project → Deployments → View Build Logs
3. Check Neon logs: Dashboard → Your Project → Logs

---

**Last Updated**: Configuration supports both local and cloud deployment with zero breaking changes to local development.
