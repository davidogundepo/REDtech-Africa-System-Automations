# Feedback System Setup Guide

Your feedback form is failing because the Google Sheets webhook isn't configured. Follow these steps to fix it.

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it **"REDtech Feedback"** (or any name you prefer)
4. Keep this tab open

## Step 2: Deploy the Apps Script Webhook

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any default code in the editor
3. Copy the entire contents of `google-apps-script-feedback-webhook.js` (in this repo)
4. Paste it into the Apps Script editor
5. Click the **💾 Save** icon (or Ctrl/Cmd + S)
6. Name the project "REDtech Feedback Webhook"

## Step 3: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   - **Description**: "Feedback webhook v1"
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone** (required for Supabase to call it)
5. Click **Deploy**
6. **Authorize** the script when prompted (you may see a security warning — click "Advanced" → "Go to [project name]")
7. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```

## Step 4: Configure Supabase Edge Function

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **REDtech project**
3. Navigate to **Edge Functions** in the left sidebar
4. Find the **`feedback-to-sheets`** function
5. Click on it to open settings
6. Under **Environment Variables**, add:
   - **Key**: `APPSCRIPT_WEBHOOK_URL`
   - **Value**: Paste the Web App URL you copied in Step 3
7. Click **Save**

## Step 5: Test the Feedback Form

1. Go to your deployed app: https://ractools.vercel.app
2. Click the **Feedback** button in the header
3. Fill out the form and submit
4. Check your Google Sheet — a new row should appear with your feedback

## Troubleshooting

### "Edge Function returned a non-2xx status code"
- **Cause**: The `APPSCRIPT_WEBHOOK_URL` environment variable isn't set in Supabase
- **Fix**: Complete Step 4 above

### "Sheets webhook 403"
- **Cause**: The Apps Script deployment "Who has access" is set to "Only myself"
- **Fix**: Redeploy the script with "Who has access" set to **Anyone**

### Nothing appears in the Google Sheet
- **Cause**: The script might not be authorized or the sheet is the wrong one
- **Fix**: 
  1. In Apps Script editor, click **Run** → **testDoPost** to test manually
  2. Check the **Execution log** for errors
  3. Make sure you're looking at the correct Google Sheet (the one where you deployed the script)

### "Authorization required"
- **Cause**: Google needs you to authorize the script
- **Fix**: 
  1. Click **Review permissions**
  2. Choose your Google account
  3. Click **Advanced** → **Go to [project name] (unsafe)**
  4. Click **Allow**

## Alternative: Use a Different Sheet

If you want the feedback to go to a specific Google Sheet (not the one where the script lives):

1. Open the target Google Sheet
2. Copy its ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```
3. In the Apps Script, replace this line:
   ```javascript
   const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
   ```
   with:
   ```javascript
   const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID_HERE').getActiveSheet();
   ```

## Security Note

The webhook URL is public (anyone with the URL can submit data). This is necessary for Supabase Edge Functions to call it. If you need to restrict access:

1. Add a secret token to the payload in `src/components/layout/Header.tsx`
2. Validate the token in the Apps Script before writing to the sheet
3. Store the token as an environment variable in both Supabase and the script

Let me know if you hit any issues!
