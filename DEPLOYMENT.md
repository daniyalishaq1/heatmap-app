# Heatmap App - Vercel Deployment Guide

This guide will help you deploy your Heatmap application to Vercel with a free Postgres database.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at https://vercel.com)
3. Node.js installed locally

## Step 1: Prepare Your Code

Your code is already prepared with all necessary database integration!

## Step 2: Push to GitHub

```bash
cd /Users/daniyal/Heatmaps/heatmap-app

# Initialize git if not already done
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Heatmap app with database support"

# Create GitHub repository (you'll need GitHub CLI or do this manually)
# Option A: Using GitHub CLI
gh repo create heatmap-app --public --source=. --push

# Option B: Manual - Create repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/heatmap-app.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### 3.1: Connect to Vercel

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Click "Import"

### 3.2: Configure Build Settings

Vercel should auto-detect Next.js settings. If not:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

Click "Deploy" (it will fail first time - that's expected!)

### 3.3: Add Postgres Database

1. In your Vercel project dashboard, go to the "Storage" tab
2. Click "Create Database"
3. Select "Postgres"
4. Choose a name (e.g., "heatmap-db")
5. Select a region close to your users
6. Click "Create"

The environment variables will be automatically added to your project!

### 3.4: Initialize Database

After deployment succeeds, visit:
```
https://your-app.vercel.app/api/init-db
```

You should see: `{"success":true,"message":"Database initialized successfully"}`

### 3.5: Upload Your Existing CSV Files

You have two options:

**Option A: Upload via UI**
1. Visit your deployed app
2. Use the file upload button at the top
3. Upload each CSV file one by one

**Option B: Use Migration Script (local only)**
This only works locally if you have access to the Data folder:
```bash
# First, add your database credentials to .env.local
# Copy from Vercel dashboard → Settings → Environment Variables

# Then run:
curl -X POST http://localhost:3001/api/migrate
```

## Step 4: Test Your App

1. Visit your Vercel deployment URL
2. You should see the file upload button
3. Upload a CSV file
4. Select it from the dropdown
5. The heatmap should display!

## Environment Variables

The following environment variables are automatically set by Vercel when you create a Postgres database:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Updating Your App

To push updates:

```bash
git add .
git commit -m "Your update message"
git push
```

Vercel will automatically redeploy!

## CSV File Format

Your CSV files should follow this format:

```csv
When your ads showed,,
"April 1, 2025 - June 30, 2025",,
Hour of the day,Day of the week,Conversions
0,Sunday,0
0,Monday,5
...
```

The app automatically:
- Skips metadata rows
- Finds the header row with "Hour of the day"
- Parses the data correctly

## Troubleshooting

### Database Connection Error
- Ensure database is created in Vercel
- Check environment variables are set
- Visit `/api/init-db` to initialize tables

### Upload Not Working
- Check file is .csv format
- Check file size (keep under 1MB for best performance)
- Check browser console for errors

### Heatmap Not Displaying
- Check CSV format matches expected structure
- Check browser console for parsing errors
- Verify data has been uploaded successfully

## Cost

- **Vercel Hosting**: FREE (Hobby plan)
- **Postgres Database**: FREE (60 hours compute/month on free tier)
- **Total Cost**: $0/month for typical usage

## Support

For issues, check:
1. Vercel deployment logs
2. Browser console
3. API endpoint responses

---

Made with ❤️ for visualizing conversion data
