# Deployment Verification Checklist

Use this checklist to verify everything is working correctly.

## ✅ Pre-Deployment Checks

### Local Development
- [ ] `npm run dev` starts both frontend and backend
- [ ] Frontend accessible at `http://localhost:5173`
- [ ] Backend accessible at `http://localhost:3000`
- [ ] Local database connection works
- [ ] File uploads work (saved to `uploads/` folder)
- [ ] Login/logout works
- [ ] All pages load correctly

### Code Verification
- [ ] All axios imports updated to `axiosInstance`
- [ ] `client/src/utils/axios.ts` exists
- [ ] `client/vercel.json` exists
- [ ] `src/server.ts` has CORS configuration
- [ ] `src/server.ts` has `/health` endpoint
- [ ] `src/routes/documents.ts` has Cloudinary support
- [ ] No linting errors

### Git
- [ ] All changes committed
- [ ] `.env` files NOT committed (check `.gitignore`)
- [ ] Ready to push to GitHub

---

## 🌐 Cloud Platform Setup

### Neon Database
- [ ] Account created at neon.tech
- [ ] Project created
- [ ] Connection string copied
- [ ] Connection string includes `?sslmode=require`

### Cloudinary
- [ ] Account created at cloudinary.com
- [ ] Cloud Name copied
- [ ] API Key copied
- [ ] API Secret copied

### Render (Backend)
- [ ] Account created at render.com
- [ ] GitHub repository connected
- [ ] Web Service created with correct settings:
  - [ ] Name: `rayenna-crm-backend`
  - [ ] Root Directory: `/` (root)
  - [ ] Build Command: `npm install && npx prisma generate && npm run build:server`
  - [ ] Start Command: `npm run start`
  - [ ] Instance Type: Free
- [ ] Environment Variables set:
  - [ ] `DATABASE_URL` (Neon connection string)
  - [ ] `JWT_SECRET` (strong random string)
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000` (or leave default)
  - [ ] `CLOUDINARY_CLOUD_NAME`
  - [ ] `CLOUDINARY_API_KEY`
  - [ ] `CLOUDINARY_API_SECRET`
  - [ ] `OPENAI_API_KEY` (if using AI features)
  - [ ] `FRONTEND_URL` (set after Vercel deployment)
- [ ] Service deployed successfully
- [ ] Backend URL noted (e.g., `https://rayenna-crm-backend.onrender.com`)

### Vercel (Frontend)
- [ ] Account created at vercel.com
- [ ] GitHub repository connected
- [ ] Project created with correct settings:
  - [ ] Framework: Vite
  - [ ] Root Directory: `client`
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
- [ ] Environment Variable set:
  - [ ] `VITE_API_BASE_URL` (Render backend URL)
- [ ] Frontend deployed successfully
- [ ] Frontend URL noted (e.g., `https://rayenna-crm.vercel.app`)

---

## 🔄 Post-Deployment Verification

### Backend Health Check
- [ ] Visit `https://your-backend.onrender.com/health`
- [ ] Should return: `{"status":"ok","timestamp":"..."}`
- [ ] Visit `https://your-backend.onrender.com/api/health`
- [ ] Should return same response

### Update Render CORS
- [ ] Go to Render dashboard
- [ ] Update `FRONTEND_URL` environment variable with Vercel URL
- [ ] Service restarts automatically

### Frontend Tests
- [ ] Visit Vercel URL
- [ ] Login page loads
- [ ] Can login successfully
- [ ] Dashboard loads
- [ ] Navigation works
- [ ] All pages accessible

### Database Tests
- [ ] Create a new customer
- [ ] Customer appears in list
- [ ] Refresh page - customer persists
- [ ] Create a new project
- [ ] Project appears in list
- [ ] Refresh page - project persists

### File Upload Tests
- [ ] Go to a project
- [ ] Upload a document/image
- [ ] File uploads successfully
- [ ] File appears in document list
- [ ] Can view/download file
- [ ] File URL is from Cloudinary (check in browser dev tools)

### API Tests
- [ ] All API calls work (no CORS errors in browser console)
- [ ] Export to Excel works (Customer Master)
- [ ] Export to CSV works (Customer Master)
- [ ] Export to Excel works (Projects)
- [ ] Export to CSV works (Projects)
- [ ] Tally export works

---

## 🐛 Troubleshooting

### Backend Issues

**Service won't start:**
- [ ] Check Render logs for errors
- [ ] Verify all environment variables are set
- [ ] Check `DATABASE_URL` format (must include `?sslmode=require`)
- [ ] Verify Prisma client generated (`npx prisma generate` in logs)

**Database connection errors:**
- [ ] Verify `DATABASE_URL` is correct
- [ ] Check Neon dashboard for connection issues
- [ ] Verify SSL is enabled in connection string

**File upload errors:**
- [ ] Verify Cloudinary credentials are correct
- [ ] Check Cloudinary dashboard for errors
- [ ] Verify file size within limits

### Frontend Issues

**Can't connect to backend:**
- [ ] Verify `VITE_API_BASE_URL` in Vercel environment variables
- [ ] Check browser console for errors
- [ ] Verify backend URL includes `https://`
- [ ] Check CORS errors - verify `FRONTEND_URL` is set in Render

**404 errors on page refresh:**
- [ ] Verify `vercel.json` exists in `client/` folder
- [ ] Check Vercel routing configuration

**Build errors:**
- [ ] Check Vercel build logs
- [ ] Verify all dependencies in `client/package.json`
- [ ] Check for TypeScript errors

---

## ✅ Final Verification

- [ ] Local development still works
- [ ] Production frontend accessible
- [ ] Production backend accessible
- [ ] Database connected
- [ ] File uploads working
- [ ] All features functional
- [ ] No console errors
- [ ] No CORS errors

---

## 📝 Notes

- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds (cold start)
- Neon free tier has connection limits - check dashboard
- Cloudinary free tier has storage/bandwidth limits - monitor usage

---

**Deployment Complete!** ✅

All local development features remain intact. You can continue developing locally while production runs in the cloud.
