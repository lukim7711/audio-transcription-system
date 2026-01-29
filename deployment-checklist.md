# 🚀 Deployment Checklist - Complete Guide

Step-by-step guide for deploying Audio Transcription System to production.

---

## 📋 Prerequisites

### Required Accounts & Tools
- [ ] Cloudflare account (free tier)
- [ ] GitHub account with repository cloned
- [ ] Kaggle account verified
- [ ] Node.js 18+ installed locally
- [ ] Git installed

---

## 📦 Phase 0: Understanding Project Structure

This project uses a **monorepo structure** with dependencies at two levels:

```
audio-transcription-system/
├── node_modules/          ← ROOT: Wrangler CLI only
├── package.json           ← ROOT: Deployment scripts
├── wrangler.toml          ← Cloudflare configuration
├── frontend/
│   ├── node_modules/      ← FRONTEND: React, Vite, TypeScript, etc.
│   ├── package.json       ← FRONTEND: Application dependencies
│   ├── src/               ← Source code
│   └── dist/              ← Build output (generated)
├── database/
│   └── schema.sql
└── .github/workflows/
    └── transcription.yml
```

**Two levels of dependencies:**
1. **Root** (`/`) - Infrastructure tools (wrangler only)
2. **Frontend** (`/frontend`) - Application code (React ecosystem)

---

## 🔧 Phase 1: Initial Setup & Dependencies

### Step 1: Clone and Install Dependencies

```bash
# Clone repository (if not already)
git clone https://github.com/yourusername/audio-transcription-system.git
cd audio-transcription-system

# Install ROOT dependencies (wrangler CLI)
npm install

# Install FRONTEND dependencies (React, Vite, etc.)
cd frontend
npm install
cd ..
```

**Verify installation:**
```bash
# Check wrangler is available
npx wrangler --version

# Check frontend dependencies
cd frontend
npm list react vite typescript
cd ..
```

- [ ] Root `node_modules/` created (contains wrangler)
- [ ] Frontend `node_modules/` created (contains React, Vite, etc.)
- [ ] Both `package-lock.json` files generated
- [ ] No installation errors

### Step 2: Fix TypeScript Errors

Before building, fix known TypeScript issues:

```bash
cd frontend

# Fix 1: Remove unused import in JobForm
sed -i 's/import { validateYouTubeUrl, getValidationError }/import { getValidationError }/' src/components/JobForm/index.tsx

# Fix 2: Fix NodeJS type in usePolling
sed -i 's/NodeJS.Timeout/ReturnType<typeof setInterval>/' src/hooks/usePolling.ts

# Fix 3: Remove unused Job import in StatusPage  
sed -i '/^import { Job } from/d' src/pages/StatusPage.tsx

cd ..
```

**Or manually edit:**
- `frontend/src/components/JobForm/index.tsx` - Remove `validateYouTubeUrl` from import
- `frontend/src/hooks/usePolling.ts` - Change `NodeJS.Timeout` to `ReturnType<typeof setInterval>`
- `frontend/src/pages/StatusPage.tsx` - Remove `import { Job } from '../types';`

- [ ] TypeScript errors fixed
- [ ] Test build: `cd frontend && npm run build`
- [ ] Build succeeds without errors
- [ ] `frontend/dist/` folder created

---

## 🗄️ Phase 2: Cloudflare Infrastructure

### Step 1: Create D1 Database

```bash
# From project root
npx wrangler d1 create transcriptions-db
```

**Output will show:**
```
✅ Successfully created DB 'transcriptions-db'!

[[d1_databases]]
binding = "DB"
database_name = "transcriptions-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

- [ ] Database created successfully
- [ ] **Copy the `database_id`** (you'll need it next)

**Update `wrangler.toml` in project root:**

```toml
name = "audio-transcription-system"
compatibility_date = "2024-01-01"
pages_build_output_dir = "frontend/dist"

[[d1_databases]]
binding = "DB"
database_name = "transcriptions-db"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"  # ← Paste here!

[[r2_buckets]]
binding = "R2"
bucket_name = "transcriptions"
```

- [ ] `wrangler.toml` updated with database_id
- [ ] File saved

**Run Production Migration:**

```bash
# NO --local flag for production database!
npx wrangler d1 execute transcriptions-db --file=database/schema.sql
```

**Verify migration:**
```bash
# Check tables exist
npx wrangler d1 execute transcriptions-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

- [ ] Migration successful
- [ ] Tables created: `jobs`
- [ ] No SQL errors

### Step 2: Create R2 Bucket

```bash
npx wrangler r2 bucket create transcriptions
```

- [ ] Bucket created: `transcriptions`
- [ ] Verify in Cloudflare Dashboard → R2 → Buckets

### Step 3: Generate R2 API Tokens

1. **Cloudflare Dashboard** → **R2** → **Manage R2 API Tokens**
2. Click **"Create API Token"**
3. Configure:
   - **Token Name:** "Transcription System"
   - **Permissions:** Object Read & Write
   - **TTL:** Forever (or set expiration)
   - **Apply to specific bucket:** `transcriptions`
4. **Create API Token**

**Save these immediately (cannot view again):**
- [ ] **Access Key ID:** `xxxxxxxxxxxxxxxxxxxx`
- [ ] **Secret Access Key:** `yyyyyyyyyyyyyyyyyyyy`
- [ ] **Endpoint URL:** `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

⚠️ **Store securely** - secret key shown only once!

---

## 🔑 Phase 3: GitHub Configuration

### Step 1: Generate GitHub Personal Access Token

1. **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Configure:
   - **Note:** "Audio Transcription System"
   - **Expiration:** No expiration (or 1 year)
   - **Scopes:** ✅ Check **`repo`** (Full control of private repositories)
4. **Generate token**
5. **Copy token immediately**

- [ ] Token generated: `ghp_xxxxxxxxxxxxxxxxxxxx`
- [ ] Token saved securely
- [ ] Has `repo` scope enabled

### Step 2: Generate Webhook Secret

```bash
# Generate secure random secret
openssl rand -hex 32
```

- [ ] Secret generated (64 character hex string)
- [ ] Saved for use in both GitHub and Cloudflare

### Step 3: Set GitHub Repository Secrets

Navigate to: **Your Repository** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets one by one:

| Secret Name | Value | Where to Get |
|------------|-------|--------------|
| `KAGGLE_USERNAME` | your_kaggle_username | Kaggle → Settings → Account |
| `KAGGLE_KEY` | your_kaggle_api_key | Kaggle → Settings → API → Create New API Token |
| `WEBHOOK_SECRET` | (from Step 2) | `openssl rand -hex 32` |
| `WEBHOOK_URL` | *Leave empty for now* | Will update after deployment |
| `R2_ENDPOINT` | `https://xxx.r2.cloudflarestorage.com` | From Phase 2, Step 3 |
| `R2_ACCESS_KEY` | access_key_id | From Phase 2, Step 3 |
| `R2_SECRET_KEY` | secret_access_key | From Phase 2, Step 3 |
| `R2_BUCKET` | `transcriptions` | Bucket name |

**Checklist:**
- [ ] `KAGGLE_USERNAME` ✓
- [ ] `KAGGLE_KEY` ✓
- [ ] `WEBHOOK_SECRET` ✓
- [ ] `WEBHOOK_URL` (skip for now) ⏸️
- [ ] `R2_ENDPOINT` ✓
- [ ] `R2_ACCESS_KEY` ✓
- [ ] `R2_SECRET_KEY` ✓
- [ ] `R2_BUCKET` ✓

**Get Kaggle Credentials:**
1. Go to https://www.kaggle.com/settings
2. Scroll to **API** section
3. Click **"Create New API Token"**
4. Download `kaggle.json`
5. Extract `username` and `key` from JSON file

---

## 🚀 Phase 4: Initial Deployment

### Step 1: Build Frontend for Production

```bash
# From project root
cd frontend
npm install  # Ensure all dependencies installed
npm run build  # TypeScript + Vite build
cd ..
```

**Verify build:**
- [ ] Build completes without errors
- [ ] `frontend/dist/` folder created
- [ ] Contains: `index.html`, `assets/` folder with JS/CSS files
- [ ] No TypeScript compilation errors

### Step 2: Deploy to Cloudflare Pages

**Option A: Via Cloudflare Dashboard (Recommended for first deploy)**

1. **Cloudflare Dashboard** → **Pages** → **Create application** → **Connect to Git**
2. **Select repository:** `audio-transcription-system`
3. **Configure build settings:**
   - **Production branch:** `main`
   - **Build command:** `cd frontend && npm install && npm run build`
   - **Build output directory:** `frontend/dist`
   - **Root directory:** `/` (default)
4. Click **Save and Deploy**
5. Wait for deployment (2-3 minutes)
6. **Copy production URL:** `https://xxxxx-xxxx.pages.dev`

**Option B: Via CLI (Alternative)**

```bash
# From project root (ensure frontend/dist exists)
npx wrangler pages deploy frontend/dist --project-name audio-transcription-system
```

**Checklist:**
- [ ] Deployment successful
- [ ] **Production URL obtained:** `https://xxxxx.pages.dev`
- [ ] Site loads (may have errors - we'll fix next)

### Step 3: Configure D1 and R2 Bindings

**Via Cloudflare Dashboard:**

1. **Cloudflare Dashboard** → **Pages** → **audio-transcription-system** → **Settings** → **Functions**
2. Scroll to **Bindings** → **Add binding**

**Add D1 Database Binding:**
- **Variable name:** `DB`
- **D1 database:** `transcriptions-db`
- Click **Save**

**Add R2 Bucket Binding:**
- **Variable name:** `R2`
- **R2 bucket:** `transcriptions`
- Click **Save**

- [ ] D1 binding `DB` → `transcriptions-db` added
- [ ] R2 binding `R2` → `transcriptions` added
- [ ] **Redeploy** (bindings require redeployment)

---

## 🔐 Phase 5: Set Environment Variables

### Method 1: Via Dashboard (Easier - Recommended)

1. **Cloudflare Dashboard** → **Pages** → **audio-transcription-system**
2. **Settings** → **Environment variables**
3. **Production** tab → **Add variables**

Add each variable:

| Variable Name | Value (Example) |
|--------------|-----------------|
| `ALLOWED_ORIGIN` | `https://your-site.pages.dev` (your production URL) |
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxx` (from Phase 3, Step 1) |
| `GITHUB_REPO` | `yourusername/audio-transcription-system` |
| `WEBHOOK_SECRET` | (from Phase 3, Step 2 - same as GitHub) |
| `WEBHOOK_URL` | `https://your-site.pages.dev` (same as ALLOWED_ORIGIN) |

**Important:**
- Use your **actual production URL** from Phase 4, Step 2
- `WEBHOOK_SECRET` must match GitHub secret exactly
- No trailing slash in URLs

- [ ] All 5 variables added
- [ ] Values are correct
- [ ] Click **Save**
- [ ] **Redeploy** to apply changes

### Method 2: Via CLI (Alternative)

```bash
# Add --project-name to all commands!

npx wrangler pages secret put ALLOWED_ORIGIN --project-name audio-transcription-system
# Paste: https://your-production-url.pages.dev

npx wrangler pages secret put GITHUB_TOKEN --project-name audio-transcription-system
# Paste: ghp_xxxxxxxxxxxx

npx wrangler pages secret put GITHUB_REPO --project-name audio-transcription-system
# Type: yourusername/audio-transcription-system

npx wrangler pages secret put WEBHOOK_SECRET --project-name audio-transcription-system
# Paste: (your webhook secret)

npx wrangler pages secret put WEBHOOK_URL --project-name audio-transcription-system
# Paste: https://your-production-url.pages.dev
```

---

## 🔄 Phase 6: Update GitHub Webhook URL

Now that we have production URL, update GitHub secret:

1. **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Find **`WEBHOOK_URL`** secret
3. **Update** or **Add** with value: `https://your-production-url.pages.dev/api/webhook`

**Note:** Include `/api/webhook` path!

- [ ] `WEBHOOK_URL` updated to production URL + `/api/webhook`

---

## 🧪 Phase 7: Testing

### Test 1: Frontend Loads

Visit your production URL:

- [ ] Page loads without errors
- [ ] Open DevTools (F12) → Console → No errors
- [ ] Form displays correctly
- [ ] UI is responsive

### Test 2: API Health Check (Optional)

```bash
# Test API is responding
curl https://your-site.pages.dev/api/history
```

Expected: JSON response with jobs array (empty is OK)

### Test 3: Submit Test Job

1. **Go to production URL**
2. **Enter YouTube URL:** `https://youtube.com/watch?v=jNQXAC9IVRw` (short video)
3. **Model size:** `small` (faster for testing)
4. **Language:** `auto`
5. **Click Submit**

Expected behavior:
- [ ] Form submits without errors
- [ ] Redirects to `/status/{job_id}` page
- [ ] Job ID displayed
- [ ] Status shows `"pending"`
- [ ] Page starts polling every 3 seconds

### Test 4: Verify GitHub Actions Triggered

1. **GitHub Repository** → **Actions** tab
2. Look for newest workflow run

- [ ] Workflow appeared
- [ ] Workflow is running (yellow status)
- [ ] No immediate errors in logs

### Test 5: Monitor Job Progress

Watch the status page (auto-refreshes):

Expected progression:
1. **pending** (0-10 seconds) - Job queued
2. **processing** (2-5 minutes) - Kaggle transcribing
3. **completed** - Auto-redirect to player

- [ ] Status changes: `pending` → `processing`
- [ ] Status changes: `processing` → `completed`
- [ ] Auto-redirects to `/player/{job_id}`

### Test 6: Verify Player Page

On player page:

- [ ] Audio player loads
- [ ] Transcript text displays
- [ ] Words highlight as audio plays (click play button)
- [ ] Clicking word seeks to timestamp
- [ ] Download buttons exist:
  - [ ] Download JSON
  - [ ] Download SRT
  - [ ] Download TXT

### Test 7: Verify R2 Storage

**Cloudflare Dashboard** → **R2** → **transcriptions** → **Browse objects**

- [ ] Folder `jobs/{job_id}/` exists
- [ ] Contains 4 files:
  - `transcript.json` (largest, ~10KB+)
  - `transcript.srt` (subtitle format)
  - `transcript.txt` (plain text)
  - `audio.m4a` (audio file, several MB)
- [ ] Files have non-zero sizes

### Test 8: Verify Database

```bash
# Check job in database
npx wrangler d1 execute transcriptions-db --command "SELECT id, status, video_title FROM jobs ORDER BY created_at DESC LIMIT 1;"
```

- [ ] Job record exists
- [ ] Status is `completed`
- [ ] Video title populated

---

## ✅ Final Verification

### Checklist

**Infrastructure:**
- [ ] D1 database created and migrated
- [ ] R2 bucket created with API tokens
- [ ] Cloudflare Pages project deployed
- [ ] Bindings configured (DB and R2)
- [ ] All environment variables set

**GitHub:**
- [ ] Personal Access Token created with `repo` scope
- [ ] All repository secrets set (8 total)
- [ ] GitHub Actions workflow triggers successfully

**Application:**
- [ ] Frontend builds without errors
- [ ] Site loads on production URL
- [ ] Test job completes successfully
- [ ] Player page works with word highlighting
- [ ] Downloads work (JSON, SRT, TXT)
- [ ] Files stored in R2
- [ ] Database records accurate

---

## 🐛 Common Issues & Solutions

### Issue: "Database binding not found"

**Symptoms:** API errors mentioning `env.DB`

**Solution:**
1. Pages → Settings → Functions → Bindings
2. Verify `DB` binding exists pointing to `transcriptions-db`
3. **Redeploy** after adding binding

### Issue: "Failed to trigger GitHub workflow"

**Symptoms:** Job stuck in `pending`, no workflow appears

**Possible causes:**
- GitHub token lacks `repo` scope
- `GITHUB_REPO` format wrong
- Token expired

**Solution:**
1. Regenerate GitHub PAT with `repo` scope
2. Verify `GITHUB_REPO` format: `username/repository` (no `.git`)
3. Update `GITHUB_TOKEN` in Cloudflare
4. Redeploy

### Issue: CORS errors in browser console

**Symptoms:** `Access-Control-Allow-Origin` errors

**Solution:**
1. Check `ALLOWED_ORIGIN` in Cloudflare env vars
2. Must match production URL **exactly**:
   - ✅ `https://xxx.pages.dev`
   - ❌ `https://xxx.pages.dev/` (no trailing slash)
   - ❌ `xxx.pages.dev` (missing protocol)
3. Redeploy after fixing

### Issue: Kaggle notebook fails

**Symptoms:** Job status changes to `failed`, error mentions Kaggle

**Causes:**
- Invalid Kaggle API credentials
- Exceeded GPU quota (30 hours/week)
- Video download failed

**Solution:**
1. Verify `KAGGLE_USERNAME` and `KAGGLE_KEY` are correct
2. Check Kaggle → Settings → Account → API usage
3. Try shorter/different video
4. Check GitHub Actions logs for details

### Issue: TypeScript build errors

**Symptoms:** `npm run build` fails with TS errors

**Solution:**
Apply fixes from Phase 1, Step 2:
- Remove unused imports
- Fix `NodeJS.Timeout` type
- Ensure all dependencies installed

### Issue: "Project not found" in wrangler commands

**Symptoms:** `wrangler pages secret put` fails

**Solution:**
Add `--project-name audio-transcription-system` to command:
```bash
npx wrangler pages secret put VARIABLE_NAME --project-name audio-transcription-system
```

---

## 📊 Monitoring & Maintenance

### Daily Checks

1. **Job Success Rate**
```bash
# Check failed jobs
npx wrangler d1 execute transcriptions-db --command "SELECT COUNT(*) as failed FROM jobs WHERE status='failed';"
```

2. **Kaggle GPU Quota**
- Kaggle → Settings → Account
- Monitor weekly GPU hours (30h limit)

3. **GitHub Actions**
- Repository → Actions
- Check for failed workflow runs

### Weekly Tasks

1. **Review failed jobs**
```sql
SELECT id, video_url, error_message 
FROM jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

2. **Check storage usage**
- Cloudflare → R2 → transcriptions
- Monitor size (10GB free tier limit)

3. **Update dependencies**
```bash
cd frontend
npm outdated
npm update
```

### Useful Queries

```bash
# Total jobs by status
npx wrangler d1 execute transcriptions-db --command "SELECT status, COUNT(*) as count FROM jobs GROUP BY status;"

# Average processing time
npx wrangler d1 execute transcriptions-db --command "SELECT AVG(processing_time) as avg_seconds FROM jobs WHERE status='completed';"

# Recent jobs
npx wrangler d1 execute transcriptions-db --command "SELECT id, status, video_title, created_at FROM jobs ORDER BY created_at DESC LIMIT 5;"
```

---

## 🎉 Success!

Your Audio Transcription System is now live in production!

**What you've accomplished:**
- ✅ Serverless infrastructure on Cloudflare
- ✅ Automated GPU transcription via Kaggle
- ✅ Real-time status updates
- ✅ Word-level audio synchronization
- ✅ Multiple export formats
- ✅ **100% free tier usage!**

**Next steps:**
- Share with users
- Collect feedback
- Monitor performance
- Plan new features

**Resources:**
- Cloudflare Dashboard: https://dash.cloudflare.com
- Kaggle Dashboard: https://www.kaggle.com/code
- GitHub Actions: https://github.com/username/repository/actions

---

**Need help?** Review the troubleshooting section or check logs in:
- Cloudflare Pages → Deployments → View details
- GitHub → Actions → Select workflow run
- Kaggle → Code → Your notebooks
