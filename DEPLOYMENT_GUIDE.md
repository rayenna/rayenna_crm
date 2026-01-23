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
5. **Get Frontend URL**: Note your Vercel URL (e.g., `https://rayenna-crm.vercel.app`)
6. **Update Render Environment Variable**:
   - Go back to Render dashboard
   - Update `FRONTEND_URL` to your Vercel URL
   - Render will automatically restart with new CORS settings

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
- Check `VITE_API_BASE_URL` in Vercel environment variables
- Verify backend URL is correct (with https://)
- Check browser console for CORS errors

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
