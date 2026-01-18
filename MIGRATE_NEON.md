# Migrate Neon Database - Step by Step Guide

This guide will help you run Prisma migrations against your Neon production database.

## ⚠️ IMPORTANT
- This will create tables in your **Neon production database**
- Make sure you have the correct Neon connection string
- Do NOT commit your `.env` file with production credentials

## Step 1: Get Neon Database URL

1. Go to [Neon Dashboard](https://console.neon.tech)
2. Select your database project
3. Go to **Connection Details**
4. Copy the **Pooled connection string** (recommended) or **Direct connection string**
   - Format: `postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

## Step 2: Set DATABASE_URL Locally (Temporary)

**⚠️ This is TEMPORARY - Do NOT commit this to Git**

1. In your backend root folder, create or edit `.env` file:
   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
   ```
   
   Replace with your actual Neon connection string.

2. **Verify `.env` is in `.gitignore`** (it should be already)

## Step 3: Run Prisma Migrations

From the backend root folder, run:

```bash
# Deploy all pending migrations to Neon
npm run prisma:migrate:deploy
```

Or directly:
```bash
npx prisma migrate deploy
```

This will:
- ✅ Create all tables (users, projects, customers, leads, etc.)
- ✅ Apply all migrations from `prisma/migrations/` folder
- ✅ Set up the complete database schema

## Step 4: Seed Initial Users

After migrations are complete, seed the database with default users:

```bash
npm run prisma:seed
```

Or directly:
```bash
npx prisma db seed
```

This creates:
- **Admin**: admin@rayenna.com / admin123
- **Sales**: sales@rayenna.com / sales123
- **Operations**: operations@rayenna.com / ops123
- **Finance**: finance@rayenna.com / finance123

## Step 5: Verify Tables Exist

### Option A: Using Neon SQL Editor

1. Go to Neon Dashboard → Your Database → **SQL Editor**
2. Run this query:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
3. You should see tables like: `users`, `projects`, `customers`, `leads`, etc.

### Option B: Using Prisma Studio

```bash
npm run prisma:studio
```

This opens Prisma Studio where you can browse all tables.

## Step 6: Restart Render Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Click **Manual Deploy** → **Restart**

Or wait for automatic restart after your next git push.

## Step 7: Test Login

1. Go to your Vercel frontend: https://rayenna-crm-kappa.vercel.app
2. Try logging in with:
   - Email: `admin@rayenna.com`
   - Password: `admin123`

## Troubleshooting

### Error: "Migration already applied"
- This is normal if you've run migrations before
- The migration system tracks which migrations have been applied

### Error: "Connection refused" or "Database does not exist"
- Double-check your `DATABASE_URL` in `.env`
- Make sure you're using the correct connection string from Neon
- Verify the database exists in Neon dashboard

### Error: "Table already exists"
- The migrations might have been partially applied
- You can reset (⚠️ **WARNING: This deletes all data**):
  ```bash
  npx prisma migrate reset
  ```
- Or manually drop tables in Neon SQL Editor

### Still can't login after migrations?
- Check Render logs for errors
- Verify users were seeded: `npm run prisma:studio` and check `users` table
- Make sure `DATABASE_URL` is set correctly in Render environment variables

## Next Steps After Migration

1. **Change default passwords** in production (use the admin panel)
2. **Remove local `.env`** or switch back to local database URL
3. **Verify Render has DATABASE_URL** set in environment variables
4. **Test all features** to ensure database is working correctly

---

**Need Help?** Check Render logs or Neon dashboard for detailed error messages.
