# Password Reset Feature - Deployment Guide

## Overview
This document covers the deployment of the password reset functionality for both **Local Development** and **Production** environments.

## Prerequisites
- Database migrations must be applied
- Environment variables configured
- Prisma client generated

---

## Local Development Environment

### 1. Apply Database Migration

```bash
# Navigate to project root
cd "d:\Cursor Projects\Rayenna CRM"

# Generate Prisma client (if not already done)
npx prisma generate

# Apply migration to local database
npx prisma migrate dev
```

**Expected Output:**
```
✅ Migration `20260125000000_add_password_reset_tokens` applied successfully
```

### 2. Verify Environment Variables

Ensure your `.env` file contains:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rayenna_crm?schema=public"
JWT_SECRET="your-secret-key-here"
FRONTEND_URL="http://localhost:5173"  # Optional, defaults to localhost:5173
```

### 3. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start separately:
npm run dev:server  # Backend on http://localhost:3000
npm run dev:client  # Frontend on http://localhost:5173
```

### 4. Test Password Reset Flow

1. **Admin Login:**
   - Navigate to `http://localhost:5173/login`
   - Login as admin (admin@rayenna.com / admin123)

2. **Generate Reset Token:**
   - Go to Users page (`/users`)
   - Click "Reset Password" for any user
   - Copy the reset link from the modal

3. **Reset Password:**
   - Open the reset link in a new browser/incognito window
   - Enter new password (min 6 characters)
   - Confirm password
   - Click "Reset Password"
   - Should redirect to login page

4. **Verify:**
   - Login with the user's email and new password
   - Should successfully authenticate

---

## Production Environment (Render/Cloud)

### 1. Database Migration

The migration will be automatically applied during build if using Render's build process. However, you can also apply it manually:

**Option A: Via Render Dashboard**
- Go to your Render service → Shell
- Run: `npx prisma migrate deploy`

**Option B: Via Build Script**
- The build script (`npm run build:server`) already includes migration deployment
- Ensure `DATABASE_URL` is set in Render environment variables

### 2. Environment Variables (Render Dashboard)

Navigate to your **Backend Service** → Environment tab and ensure:

```env
DATABASE_URL=postgresql://...  # Your production database URL
JWT_SECRET=your-production-secret-key
FRONTEND_URL=https://your-frontend-domain.com  # Your frontend URL
PORT=3000  # Optional, defaults to 3000
```

**Important:** Set `FRONTEND_URL` to your actual frontend domain (e.g., `https://rayenna-crm.onrender.com` or your custom domain).

### 3. Frontend Environment Variables

Navigate to your **Frontend Service** → Environment tab:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

### 4. Deploy Steps

1. **Commit and Push:**
   ```bash
   git add .
   git commit -m "Add password reset functionality"
   git push origin main
   ```

2. **Render Auto-Deploy:**
   - Render will automatically detect the push
   - Backend will build and run migrations
   - Frontend will build with new routes

3. **Verify Deployment:**
   - Check Render logs for successful migration
   - Verify backend endpoints are accessible
   - Test password reset flow in production

### 5. Post-Deployment Verification

**Backend Health Check:**
```bash
curl https://your-backend-url.onrender.com/api/auth/me
# Should return 401 (expected, requires auth)
```

**Frontend Routes:**
- `https://your-frontend-url/reset-password?token=test` should load the reset page
- Should show "Invalid or Expired Token" for invalid tokens

---

## Migration Details

### Migration File
- **Path:** `prisma/migrations/20260125000000_add_password_reset_tokens/migration.sql`
- **Changes:**
  - Adds `resetToken` column (TEXT, nullable, unique)
  - Adds `resetTokenExpiry` column (TIMESTAMP, nullable)
  - Creates indexes for performance

### Rollback (if needed)

If you need to rollback this migration:

```sql
-- WARNING: Only run if you need to remove password reset functionality
ALTER TABLE "users" DROP COLUMN IF EXISTS "resetToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "resetTokenExpiry";
DROP INDEX IF EXISTS "users_resetToken_key";
DROP INDEX IF EXISTS "users_resetToken_idx";
```

---

## API Endpoints

### Admin-Initiated Reset
```
POST /api/auth/admin/reset-password
Headers: Authorization: Bearer <admin-token>
Body: { "userId": "user-id" }
Response: { "resetToken": "...", "resetLink": "...", "expiresAt": "..." }
```

### Verify Token
```
GET /api/auth/verify-reset-token/:token
Response: { "valid": true, "email": "...", "name": "...", "expiresAt": "..." }
```

### Reset Password
```
POST /api/auth/reset-password
Body: { "token": "...", "newPassword": "..." }
Response: { "message": "Password reset successfully" }
```

---

## Security Features

✅ **One-time tokens** - Tokens invalidated after use  
✅ **24-hour expiry** - Tokens expire after 24 hours  
✅ **Admin-only initiation** - Only ADMIN can generate reset tokens  
✅ **Secure token generation** - Uses crypto.randomBytes(32)  
✅ **Single ADMIN enforcement** - Database and application level  
✅ **Audit logging** - All reset actions logged to console  

---

## Troubleshooting

### Migration Fails

**Error:** `Migration failed to apply`

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# If migration is in failed state, reset and reapply
npx prisma migrate resolve --rolled-back 20260125000000_add_password_reset_tokens
npx prisma migrate deploy
```

### Reset Link Not Working

**Issue:** Reset link shows "Invalid or Expired Token"

**Possible Causes:**
1. Token has expired (24 hours)
2. Token was already used
3. `FRONTEND_URL` environment variable is incorrect
4. Database connection issue

**Solution:**
- Check backend logs for errors
- Verify `FRONTEND_URL` matches your frontend domain
- Generate a new reset token

### Frontend Route Not Found

**Issue:** `/reset-password` returns 404

**Solution:**
- Ensure `ResetPassword` component is imported in `App.tsx`
- Verify route is added: `<Route path="/reset-password" element={<ResetPassword />} />`
- Rebuild frontend: `npm run build:client`

### Single ADMIN Constraint Error

**Error:** "Only one ADMIN user is allowed"

**Solution:**
- This is expected behavior
- To change ADMIN, first change existing ADMIN to another role
- Then assign ADMIN role to the new user
- Or delete the existing ADMIN (not recommended)

---

## Testing Checklist

### Local Environment
- [ ] Migration applied successfully
- [ ] Prisma client generated
- [ ] Backend starts without errors
- [ ] Frontend builds successfully
- [ ] Admin can generate reset token
- [ ] Reset link works in browser
- [ ] Password reset completes successfully
- [ ] User can login with new password
- [ ] Token invalidated after use
- [ ] Expired token rejected

### Production Environment
- [ ] Migration applied in production database
- [ ] Environment variables set correctly
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Reset link uses correct frontend URL
- [ ] Password reset flow works end-to-end
- [ ] Audit logs appear in production logs
- [ ] Single ADMIN constraint enforced

---

## Support

For issues or questions:
1. Check application logs (backend and frontend)
2. Verify environment variables
3. Check database connection
4. Review migration status: `npx prisma migrate status`

---

**Last Updated:** January 25, 2026  
**Migration Version:** 20260125000000_add_password_reset_tokens
