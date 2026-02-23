# Uptime Robot setup for Rayenna CRM

Use these exact URLs and settings in [Uptime Robot](https://uptimerobot.com) to monitor your Render services and help keep the backend from going cold.

---

## Your URLs (copy-paste)

| Service  | URL |
|----------|-----|
| **Backend health** | `https://rayenna-crm-backend.onrender.com/health` |
| **Frontend**       | `https://rayenna-crm-frontend.onrender.com` |

---

## Monitor 1: Backend API (keeps it warm + alerts)

1. **Uptime Robot** → **Dashboard** → **+ Add New Monitor**
2. **Monitor Type:** `HTTP(s)`
3. **Friendly Name:** `Rayenna CRM – Backend API`
4. **URL:**  
   ```
   https://rayenna-crm.onrender.com/health
   ```
5. **Monitoring Interval:** `5 minutes`
6. **Alert Contacts:** Add your email (create under **My Settings** → **Alert Contacts** if needed)
7. **Advanced** (optional): **Keyword** = `"status":"ok"` (alert if response doesn’t contain this)
8. **Create Monitor**

---

## Monitor 2: Frontend

1. **+ Add New Monitor**
2. **Monitor Type:** `HTTP(s)`
3. **Friendly Name:** `Rayenna CRM – Frontend`
4. **URL:**  
   ```
   https://rayenna-crm-frontend.onrender.com
   ```
5. **Monitoring Interval:** `5 minutes`
6. **Alert Contacts:** same as above
7. **Create Monitor**

---

## If your Render URLs are different

- Backend: Render Dashboard → your **Web Service** → copy the URL (e.g. `https://something.onrender.com`) → use `https://YOUR-URL/health`.
- Frontend: Render Dashboard → your **Static Site** → copy the URL → use that as the frontend monitor URL.

Update this file with your URLs so the next time you need to add a monitor you have them in one place.
