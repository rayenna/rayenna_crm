# How to Set Up OpenAI API Key for Proposal Generation

The AI Proposal Generator requires an OpenAI API key to generate professional solar proposals. Follow these steps to set it up:

## Step 1: Get Your OpenAI API Key

1. **Create an OpenAI Account** (if you don't have one)
   - Go to: https://platform.openai.com/signup
   - Sign up with your email address

2. **Add Payment Method**
   - OpenAI requires a payment method to use the API
   - Go to: https://platform.openai.com/account/billing
   - Add a credit/debit card
   - Note: OpenAI offers a small free tier, but usage is pay-as-you-go after that

3. **Generate API Key**
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Give it a name (e.g., "Rayenna CRM Proposal Generator")
   - **Copy the key immediately** - you won't be able to see it again!
   - The key will look like: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 2: Add API Key to .env File

1. **Create or Edit .env File**
   
   In your project root directory (`D:\Cursor Projects\Rayenna CRM`), create or edit a file named `.env`

2. **Add the OPENAI_API_KEY**

   Open `.env` in a text editor and add:

   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

   **Example:**
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/rayenna_crm?schema=public"
   JWT_SECRET="your-secret-key-here"
   OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   ```

3. **Important Notes:**
   - **No quotes needed** around the API key (unless it contains special characters)
   - **No spaces** around the `=` sign
   - **Keep it secret** - never commit `.env` to git (it's already in `.gitignore`)

## Step 3: Verify Setup

1. **Restart the Server**
   
   After adding the API key, restart your development server:
   ```powershell
   # Stop the current server (Ctrl+C)
   # Then start again
   npm run dev
   ```

2. **Test the Proposal Generator**
   
   - Navigate to any project in the CRM
   - Click "Generate AI Proposal"
   - If configured correctly, the proposal should generate successfully
   - If you see "OpenAI API key not configured", check your `.env` file

## Troubleshooting

### Error: "OpenAI API key not configured"

**Solutions:**
- ✅ Make sure `.env` file exists in the project root (same folder as `package.json`)
- ✅ Check that `OPENAI_API_KEY` is spelled correctly (case-sensitive)
- ✅ Verify there are no extra spaces in the `.env` file
- ✅ Restart your server after making changes to `.env`
- ✅ Check that `.env` is not in a subdirectory (should be in root)

### Error: "Incorrect API key provided"

**Solutions:**
- ✅ Verify you copied the entire API key (starts with `sk-`)
- ✅ Check for any extra spaces or characters
- ✅ Generate a new API key if needed
- ✅ Make sure your OpenAI account has credits available

### Error: "Rate limit exceeded" or "Insufficient quota"

**Solutions:**
- ✅ Check your OpenAI billing: https://platform.openai.com/account/billing
- ✅ Add credits to your account
- ✅ Wait for rate limits to reset (usually per hour/day)

## Cost Information

**OpenAI Pricing (as of 2024):**
- Model used: `gpt-4o-mini` (cost-effective, fast)
- Cost: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Average proposal: ~1000-2000 tokens = **~$0.001-0.002 per proposal** (less than 1 cent)

**Tips to Reduce Costs:**
- The proposal generator only runs when you click "Generate Proposal"
- Each proposal is cached (you can re-download PDF without regenerating)
- Consider setting up usage alerts in OpenAI dashboard

## Security Best Practices

1. **Never commit `.env` to version control** (already in `.gitignore`)
2. **Use different API keys for development and production**
3. **Set up API key restrictions** in OpenAI dashboard (limit to specific IPs if possible)
4. **Monitor usage** regularly at https://platform.openai.com/usage
5. **Rotate keys** periodically for security

## Quick Reference

**File Location:**
```
D:\Cursor Projects\Rayenna CRM\.env
```

**Required Content:**
```env
OPENAI_API_KEY=sk-your-key-here
```

**Where to Get Key:**
https://platform.openai.com/api-keys

**Cost:**
~$0.001-0.002 per proposal generated
