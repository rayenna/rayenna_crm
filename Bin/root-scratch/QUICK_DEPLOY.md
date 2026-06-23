# Quick Deployment Guide

## 🚀 Deploying Changes (Automatic)

Since your Render backend and Vercel frontend are already connected to GitHub, deployment is automatic!

### Steps:

1. **Stage your changes:**
   ```bash
   git add .
   ```

2. **Commit with a descriptive message:**
   ```bash
   git commit -m "Fix Cloudinary upload - use upload_stream method"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main
   ```

4. **That's it!** Both services will automatically:
   - ✅ **Render**: Rebuild backend → Deploy new server
   - ✅ **Vercel**: Rebuild frontend → Deploy new build

---

## 📊 Monitoring Deployments

### Render (Backend)
- **Dashboard**: https://dashboard.render.com
- **Check**: Your service → "Events" or "Logs" tab
- **Look for**: 
  - Build progress
  - "Deploy succeeded" message
  - Cloudinary config log: `✅ Cloudinary configured: ...`

### Vercel (Frontend)
- **Dashboard**: https://vercel.com/dashboard
- **Check**: Your project → "Deployments" tab
- **Look for**: 
  - Build progress
  - "Ready" status (usually 1-2 minutes)

---

## ✅ After Deployment

1. **Verify Backend Logs** (Render):
   - Should see: `✅ Cloudinary configured: { cloud_name: '...', ... }`
   - No errors about missing env vars

2. **Test Upload** (Production):
   - Go to your Vercel URL
   - Login
   - Upload a file in any project
   - Check Render logs for: `✅ File uploaded to Cloudinary: ...`
   - Check Cloudinary dashboard: Files should appear in `rayenna_crm/` folder

3. **Verify Frontend**:
   - All pages load correctly
   - No console errors
   - Upload button works

---

## 🔧 Manual Deployment (If Needed)

If automatic deployment fails or you need to redeploy manually:

### Render:
1. Go to https://dashboard.render.com
2. Select your service
3. Click "Manual Deploy" → "Deploy latest commit"

### Vercel:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "..." menu → "Redeploy"

---

## ⚠️ Important Notes

- **Always test locally first**: `npm run dev`
- **Environment variables**: Already configured in Render/Vercel (no changes needed)
- **Database migrations**: Already applied (no action needed)
- **Build time**: Usually 2-5 minutes total

---

## 🐛 If Deployment Fails

1. **Check build logs** (Render/Vercel dashboard)
2. **Common issues**:
   - Missing dependencies → Check `package.json`
   - TypeScript errors → Fix locally, commit, push
   - Environment variables → Verify in dashboard
   - Build timeout → Contact support or upgrade plan

---

**Last Updated**: Deployment is automatic on `git push` to `main` branch.
