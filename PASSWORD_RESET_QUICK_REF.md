# Password Reset - Quick Reference

## 🚀 Quick Start

### Local Development
```bash
# 1. Apply migration
npx prisma migrate dev

# 2. Start servers
npm run dev
```

### Production (Render)
```bash
# Migration auto-applies during build
# Just push to main branch
git push origin main
```

---

## 📋 Environment Variables

### Backend (.env or Render Environment)
```env
DATABASE_URL=postgresql://...     # Required
JWT_SECRET=your-secret-key        # Required
FRONTEND_URL=https://...          # Optional (for reset links)
```

### Frontend (Render Environment)
```env
VITE_API_BASE_URL=https://...    # Required
```

---

## ✅ Verification Steps

### Local
1. ✅ Migration applied: `npx prisma migrate status`
2. ✅ Backend running: `http://localhost:3000`
3. ✅ Frontend running: `http://localhost:5173`
4. ✅ Test reset flow: Admin → Users → Reset Password

### Production
1. ✅ Check Render logs for migration success
2. ✅ Verify backend endpoint: `GET /api/auth/verify-reset-token/:token`
3. ✅ Test reset link: `https://your-frontend/reset-password?token=test`
4. ✅ Verify `FRONTEND_URL` matches your domain

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails | `npx prisma migrate resolve --rolled-back 20260125000000_add_password_reset_tokens` |
| Reset link 404 | Check `FRONTEND_URL` env var matches frontend domain |
| Token invalid | Tokens expire after 24h, generate new one |
| Single ADMIN error | Expected - only one ADMIN allowed |

---

## 📝 API Endpoints

- `POST /api/auth/admin/reset-password` - Generate token (Admin only)
- `GET /api/auth/verify-reset-token/:token` - Verify token
- `POST /api/auth/reset-password` - Reset password

---

**Full Guide:** See `PASSWORD_RESET_DEPLOYMENT.md`
