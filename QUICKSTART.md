# Quick Start Guide - Deploy in 5 Minutes

## What's Changed

Your app now uses a **database** instead of reading files from disk. This allows:
✅ Deploy to Vercel (free hosting)
✅ Upload CSV files through the UI
✅ Store unlimited CSV files
✅ Access from anywhere

## Deploy to Vercel

### 1. Install Vercel CLI (one-time setup)

```bash
npm i -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy Your App

```bash
cd /Users/daniyal/Heatmaps/heatmap-app
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- What's your project's name? **heatmap-app** (or any name)
- In which directory is your code located? **./** (press Enter)
- Want to override settings? **N**

Wait for deployment... Done! You'll get a URL like `https://heatmap-app-xxx.vercel.app`

### 4. Add Database

1. Go to https://vercel.com/dashboard
2. Click your project "heatmap-app"
3. Go to "Storage" tab
4. Click "Create Database"
5. Select "Postgres"
6. Name it "heatmap-db"
7. Click "Create"

### 5. Initialize Database

Visit: `https://your-app-url.vercel.app/api/init-db`

You should see: `{"success":true,"message":"Database initialized successfully"}`

### 6. Upload Your CSV Files

1. Go to your deployed app URL
2. Click the "Choose File" button at the top
3. Select a CSV file
4. It will automatically upload and appear in the dropdown!

## Done! 🎉

Your app is now live and you can:
- Upload CSV files from any device
- View heatmaps online
- Share the URL with others

## Next Steps

### To Update Your App

```bash
# Make changes to your code, then:
git add .
git commit -m "Update app"
vercel --prod
```

### To Add More CSV Files

Just use the upload button in the app - no code changes needed!

### To View Logs

```bash
vercel logs
```

Or view in the Vercel dashboard.

## Troubleshooting

**Problem**: Database not connecting
**Solution**: Make sure you created the Postgres database in Vercel

**Problem**: Upload not working
**Solution**: Check browser console for errors, ensure file is .csv format

**Problem**: Heatmap not showing
**Solution**: Check CSV format matches expected structure (see DEPLOYMENT.md)

## Need Help?

Check the detailed [DEPLOYMENT.md](./DEPLOYMENT.md) guide for more information.
