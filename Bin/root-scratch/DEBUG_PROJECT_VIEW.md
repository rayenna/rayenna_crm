# Debug: Project View Getting Stuck

If the project detail page is getting stuck or not loading, check these:

## Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any red error messages
4. Share the error message if you see any

## Common Issues

### 1. Contact Numbers JSON Parse Error
**Symptom:** Page hangs or shows error
**Fix:** Already fixed in code - contactNumbers now has try-catch

### 2. Date Formatting Error
**Symptom:** Page crashes on date fields
**Fix:** Check if dates are valid before formatting

### 3. API Call Hanging
**Symptom:** Loading forever
**Fix:** Check backend logs for errors

### 4. Missing Data
**Symptom:** Page shows but missing fields
**Fix:** Check if fields are null/undefined

## Quick Test

Try accessing the API directly:
```
http://localhost:3000/api/projects/[PROJECT_ID]
```

Replace `[PROJECT_ID]` with the actual project ID from the projects list.

## Check Backend Logs

Look at the terminal where `npm run dev` is running. Any errors will appear there.
