# Viriato Deployment Guide - Render.com

Complete guide to deploying Viriato (Portuguese Parliament data visualization) to Render.com.

## Architecture Overview

```
┌─────────────────┐
│  GitHub Pages   │  Static Frontend (docs/)
│  (Frontend)     │  → Calls API
└────────┬────────┘
         │
         ↓ HTTPS
┌─────────────────┐
│   Render.com    │  Flask API (api/app.py)
│   (API Backend) │  → Queries PostgreSQL
└────────┬────────┘
         │
         ↓ SQL
┌─────────────────┐
│   Render.com    │  PostgreSQL Database
│   (Database)    │  808 iniciativas, 4888 events
└─────────────────┘
```

## Prerequisites

✅ **Already completed:**
- PostgreSQL database created on Render (`viriato`)
- Database schema applied
- Data loaded (808 iniciativas, 34 agenda events)

🔲 **Need to deploy:**
- Flask API backend
- Update frontend to use API

## Step 1: Deploy Flask API to Render

### Option A: Automatic Deployment (Recommended)

1. **Push code to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Add Flask API backend"
   git push origin master
   ```

2. **Create Web Service in Render Dashboard**
   - Go to: https://dashboard.render.com/
   - Click "New +" → "Web Service"
   - Connect GitHub repository: `loukach/viriato`
   - Configure:
     ```
     Name: viriato-api
     Region: Frankfurt
     Branch: master
     Root Directory: (leave blank)
     Runtime: Python 3
     Build Command: pip install -r requirements.txt
     Start Command: gunicorn --bind 0.0.0.0:$PORT api.app:app
     Plan: Free (or Starter $7/month)
     ```

3. **Add Environment Variables**
   - Click "Advanced" → "Add Environment Variable"
   - Add:
     ```
     DATABASE_URL = [paste Internal Database URL from viriato database]
     FLASK_ENV = production
     ```
   - Internal URL format:
     ```
     postgresql://viriato_user:PASSWORD@dpg-xxxxx-a/viriato
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Test: `https://viriato-api.onrender.com/api/health`

### Option B: Using render.yaml (Blueprint)

1. **Push render.yaml to GitHub**
   ```bash
   git add render.yaml
   git commit -m "Add Render blueprint"
   git push
   ```

2. **Deploy from Blueprint**
   - Go to: https://dashboard.render.com/blueprints
   - Click "New Blueprint Instance"
   - Connect repository
   - Render will create both API and link to existing database

## Step 2: Test API Endpoints

After deployment, test these endpoints:

```bash
# Health check
curl https://viriato-api.onrender.com/api/health

# Stats
curl https://viriato-api.onrender.com/api/stats

# Search
curl "https://viriato-api.onrender.com/api/search?q=governo&limit=5"

# All iniciativas (large response)
curl https://viriato-api.onrender.com/api/iniciativas

# Single iniciativa
curl https://viriato-api.onrender.com/api/iniciativas/315506

# Agenda events
curl https://viriato-api.onrender.com/api/agenda

# Phase counts
curl https://viriato-api.onrender.com/api/phase-counts
```

Expected response for `/api/health`:
```json
{
  "status": "ok",
  "database": "connected",
  "iniciativas_count": 808
}
```

## Step 3: Update Frontend to Use API

### Current State
Frontend uses embedded `data.js` (2.6 MB) loaded directly in HTML.

### Option A: Keep GitHub Pages, Call Render API

**Pros:** Simple, no deployment changes
**Cons:** Cross-origin requests (CORS already enabled in API)

Update `docs/iniciativas.html` and `docs/agenda.html`:

```javascript
// OLD: data.js loads INITIATIVES_DATA
<script src="data.js"></script>
<script>
const iniciativas = INITIATIVES_DATA;
</script>

// NEW: Fetch from API
<script>
const API_URL = 'https://viriato-api.onrender.com';

async function loadIniciativas() {
    const response = await fetch(`${API_URL}/api/iniciativas`);
    const iniciativas = await response.json();
    // ...rest of code
}

loadIniciativas();
</script>
```

### Option B: Deploy Frontend to Render (Static Site)

**Pros:** Single domain, faster
**Cons:** Need to deploy frontend changes

1. Create static site service in Render
2. Point to `docs/` directory
3. Auto-deploy on git push

## Step 4: Enable Automatic Data Updates

### Weekly Data Refresh (Current Goal)

**Option A: GitHub Actions**

Create `.github/workflows/update-data.yml`:

```yaml
name: Update Parliament Data

on:
  schedule:
    - cron: '0 2 * * 0'  # Sundays at 2 AM UTC
  workflow_dispatch:      # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: python scripts/download_datasets.py
      - run: python scripts/load_to_postgres.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Add secret in GitHub:
- Go to repo Settings → Secrets → Actions
- Add: `DATABASE_URL` = Internal database URL from Render

**Option B: Render Cron Job**

Create `scripts/update_cron.py`:

```python
#!/usr/bin/env python3
import subprocess

# Download data
subprocess.run(['python', 'scripts/download_datasets.py'])

# Load to database
subprocess.run(['python', 'scripts/load_to_postgres.py'])
```

In Render dashboard:
- Create "Cron Job" service
- Command: `python scripts/update_cron.py`
- Schedule: `0 2 * * 0` (Sundays at 2 AM)

## Step 5: Monitoring & Maintenance

### Check API Health

```bash
# Quick health check
curl https://viriato-api.onrender.com/api/health

# Full stats
curl https://viriato-api.onrender.com/api/stats
```

### View Logs

- Render Dashboard → viriato-api → Logs
- Real-time log streaming
- Filter by error/warning

### Database Monitoring

- Render Dashboard → viriato → Metrics
- Storage: ~70 MB / 1 GB (7% used on free tier)
- Connections: Monitor active connections

### Upgrade When Needed

**Free tier limitations:**
- API: Spins down after 15 min inactivity (cold start = ~30s)
- Database: 1 GB storage, 30-day expiry

**Starter tier ($7/month database + $7/month API = $14/month):**
- Always-on API (no cold starts)
- Unlimited database lifespan
- 10 GB storage
- Daily backups

## Troubleshooting

### API Returns 500 Error

Check logs:
```bash
# View recent logs
render logs --tail=100 viriato-api
```

Common causes:
- DATABASE_URL not set
- Database not accessible
- Python dependencies missing

### CORS Errors in Frontend

API already has CORS enabled. If issues persist:
```python
# In api/app.py
CORS(app, origins=["https://loukach.github.io"])
```

### Database Connection Timeout

- Check if database is running (free tier sleeps after inactivity)
- Verify DATABASE_URL is correct (Internal vs External)
- Check Render dashboard for database status

### Slow API Response

Free tier:
- First request after idle: ~30 seconds (cold start)
- Subsequent requests: <1 second

Optimize:
- Upgrade to Starter tier (no cold starts)
- Add Redis caching for frequently accessed data
- Implement pagination for large datasets

## Cost Breakdown

### Current (Free Tier)
- PostgreSQL: Free (30 days) → Then $7/month
- API: Free (with cold starts)
- **Total: $7/month after trial**

### Recommended (Starter)
- PostgreSQL: $7/month (always-on, backups)
- API: $7/month (no cold starts)
- **Total: $14/month**

### Storage Usage
- Database: ~70 MB (7% of 1 GB free tier)
- Room to grow: Can add all 17 datasets

## Next Steps After Deployment

1. ✅ **Deploy API** - Get API running on Render
2. ✅ **Test endpoints** - Verify data is accessible
3. 🔲 **Update frontend** - Switch from data.js to API calls
4. 🔲 **Set up auto-updates** - Weekly data refresh via GitHub Actions
5. 🔲 **Monitor** - Check logs and performance
6. 🔲 **Upgrade** - When ready, switch to Starter tier

## URLs After Deployment

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | https://loukach.github.io/viriato/ | User-facing web app |
| **API** | https://viriato-api.onrender.com | REST API |
| **API Health** | https://viriato-api.onrender.com/api/health | Health check |
| **Database** | dpg-xxxxx.frankfurt-postgres.render.com | PostgreSQL (internal) |

## Support

- Render docs: https://render.com/docs
- Viriato issues: https://github.com/loukach/viriato/issues
- PostgreSQL guide: `docs/database-implementation-plan.md`
- API endpoints: See `api/app.py` for full list
