# 🚀 Deployment Checklist

Complete step-by-step checklist for deploying Audio Transcription System to production.

---

## ✅ Pre-Deployment Checklist

### 1. Accounts Setup

- [ ] Cloudflare account created (free tier)
- [ ] GitHub account with repository
- [ ] Kaggle account verified
- [ ] All credentials ready

### 2. Local Development Works

- [ ] Database schema applies successfully
- [ ] Frontend builds without errors: `cd frontend && npm run build`
- [ ] TypeScript compiles without errors
- [ ] API endpoints return correct responses
- [ ] CORS configured properly for local dev

---

## 🔧 Cloudflare Setup

### Step 1: Create D1 Database

```bash
# Create database
npx wrangler d1 create transcriptions-db

# OUTPUT EXAMPLE:
# ✅ Successfully created DB 'transcriptions-db'!
#
# [[d1_databases]]
# binding = "DB"
# database_name = "transcriptions-db"
# database_id = "xxxx-xxxx-xxxx-xxxx"
```

- [ ] Database created
- [ ] Copy `database_id` to `wrangler.toml`
- [ ] Run migration:
```bash
npx wrangler d1 execute transcriptions-db --file=database/schema.sql
```
- [ ] Verify schema: Check Cloudflare Dashboard > D1 > transcriptions-db

### Step 2: Create R2 Bucket

```bash
npx wrangler r2 bucket create transcriptions
```

- [ ] Bucket created successfully
- [ ] Bucket appears in Cloudflare Dashboard > R2

### Step 3: Generate R2 API Tokens

1. Go to: Cloudflare Dashboard > R2 > Manage R2 API Tokens
2. Click "Create API Token"
3. Permissions: Object Read & Write
4. Apply to: Specific bucket (transcriptions)

- [ ] R2 Access Key ID saved
- [ ] R2 Secret Access Key saved
- [ ] R2 Endpoint URL noted: `https://<account_id>.r2.cloudflarestorage.com`

### Step 4: Set Cloudflare Secrets

```bash
# Set each secret
npx wrangler pages secret put ALLOWED_ORIGIN
# Enter your production URL: https://yourdomain.com

npx wrangler pages secret put GITHUB_TOKEN
# Enter: ghp_xxxxxxxxxxxx

npx wrangler pages secret put GITHUB_REPO
# Enter: username/repository

npx wrangler pages secret put WEBHOOK_SECRET
# Generate: openssl rand -hex 32
# Enter the generated secret

npx wrangler pages secret put WEBHOOK_URL
# Enter: https://yourdomain.com
```

**Secrets to set:**
- [ ] `ALLOWED_ORIGIN`
- [ ] `GITHUB_TOKEN`
- [ ] `GITHUB_REPO`
- [ ] `WEBHOOK_SECRET`
- [ ] `WEBHOOK_URL`

### Step 5: Update wrangler.toml

Edit `wrangler.toml`:

```toml
name = "audio-transcription-system"
compatibility_date = "2024-01-01"
pages_build_output_dir = "frontend/dist"

[[d1_databases]]
binding = "DB"
database_name = "transcriptions-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← UPDATE THIS

[[r2_buckets]]
binding = "R2"
bucket_name = "transcriptions"
```

- [ ] `database_id` updated
- [ ] File saved

---

## 🔑 GitHub Setup

### Step 1: Get GitHub Personal Access Token

1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token
3. Select scopes: `repo` (full control)
4. Generate token
5. **SAVE THE TOKEN** (can't view again!)

- [ ] GitHub PAT created
- [ ] Token has `repo` scope
- [ ] Token saved securely

### Step 2: Set GitHub Repository Secrets

Go to: Repository > Settings > Secrets and variables > Actions > New repository secret

Required secrets:

| Secret Name | Value | Where to Get |
|------------|-------|-------------|
| `KAGGLE_USERNAME` | your_username | Kaggle > Account |
| `KAGGLE_KEY` | your_api_key | Kaggle > Account > API > Create Token |
| `WEBHOOK_SECRET` | same as Cloudflare | Use same value |
| `R2_ENDPOINT` | https://xxx.r2.cloudflarestorage.com | Cloudflare R2 |
| `R2_ACCESS_KEY` | access_key_id | Cloudflare R2 API Token |
| `R2_SECRET_KEY` | secret_access_key | Cloudflare R2 API Token |
| `R2_BUCKET` | transcriptions | Bucket name |

- [ ] `KAGGLE_USERNAME` set
- [ ] `KAGGLE_KEY` set
- [ ] `WEBHOOK_SECRET` set
- [ ] `R2_ENDPOINT` set
- [ ] `R2_ACCESS_KEY` set
- [ ] `R2_SECRET_KEY` set
- [ ] `R2_BUCKET` set

### Step 3: Verify Workflow File

Check `.github/workflows/transcription.yml` exists and is correct.

- [ ] Workflow file exists
- [ ] All secret variables referenced correctly

---

## 📦 Kaggle Setup

### Step 1: Get API Credentials

1. Go to: https://www.kaggle.com/settings
2. Scroll to "API" section
3. Click "Create New API Token"
4. Download `kaggle.json`
5. Extract username and key

- [ ] `kaggle.json` downloaded
- [ ] Username extracted
- [ ] API key extracted
- [ ] Added to GitHub secrets

### Step 2: Upload Notebook (Optional)

You can upload `kaggle/transcription_notebook.py` to Kaggle for testing:

1. Create new notebook
2. Copy paste the Python code
3. Enable GPU
4. Enable Internet
5. Test run

- [ ] Notebook tested locally (optional)
- [ ] GPU acceleration verified (optional)

---

## 🚀 Deployment

### Step 1: Build Frontend

```bash
cd frontend
npm run build
```

- [ ] Build completes without errors
- [ ] `dist/` folder created
- [ ] Check `dist/` contains HTML, JS, CSS

### Step 2: Deploy to Cloudflare

**Option A: Using Wrangler CLI**

```bash
npx wrangler pages deploy frontend/dist --project-name audio-transcription-system
```

**Option B: Using Cloudflare Dashboard**

1. Cloudflare Dashboard > Pages > Create a project
2. Connect to Git
3. Select your repository
4. Build settings:
   - Build command: `cd frontend && npm run build`
   - Build output directory: `frontend/dist`
5. Deploy

- [ ] Deployment successful
- [ ] Site URL received (e.g., `https://xxx.pages.dev`)
- [ ] Site loads correctly

### Step 3: Update Production URLs

Update these secrets with your production URL:

```bash
npx wrangler pages secret put ALLOWED_ORIGIN
# Enter: https://your-site.pages.dev

npx wrangler pages secret put WEBHOOK_URL
# Enter: https://your-site.pages.dev
```

- [ ] `ALLOWED_ORIGIN` updated
- [ ] `WEBHOOK_URL` updated

---

## 🧪 Testing

### Test 1: Submit a Job

1. Go to your production URL
2. Enter a short YouTube URL (2-3 minutes video)
3. Select "small" model
4. Submit

- [ ] Job submits successfully
- [ ] Redirects to status page
- [ ] Job ID visible

### Test 2: Check Status Polling

- [ ] Status page polls every 3 seconds
- [ ] Status changes from "pending" to "processing"
- [ ] No console errors

### Test 3: Verify GitHub Actions

1. Go to: Repository > Actions
2. Find the workflow run for your job

- [ ] Workflow triggered
- [ ] Workflow running
- [ ] No errors in logs

### Test 4: Check Kaggle Processing

1. Log into Kaggle
2. Go to Code > Your Kernels
3. Find the transcription job

- [ ] Kernel created
- [ ] Kernel running
- [ ] GPU enabled

### Test 5: Verify Completion

Wait for job to complete (5-10 minutes for small model)

- [ ] Status changes to "completed"
- [ ] Redirects to player page
- [ ] Audio player loads
- [ ] Transcript displays
- [ ] Words highlight on play
- [ ] Click-to-seek works
- [ ] Download buttons work

### Test 6: Check R2 Storage

Cloudflare Dashboard > R2 > transcriptions

- [ ] Folder `jobs/{job_id}/` exists
- [ ] Contains: `transcript.json`, `transcript.srt`, `transcript.txt`, `audio.m4a`
- [ ] Files are accessible

---

## 🔍 Verification Checklist

### Database

```bash
# Check jobs in database
npx wrangler d1 execute transcriptions-db --command "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 5"
```

- [ ] Jobs appearing in database
- [ ] Status values correct
- [ ] Timestamps accurate

### R2 Storage

- [ ] Files uploaded successfully
- [ ] File sizes reasonable
- [ ] Files downloadable

### API Endpoints

Test each endpoint:

```bash
# Submit
curl -X POST https://your-site.pages.dev/api/submit \
  -H "Content-Type: application/json" \
  -d '{"video_url":"https://youtube.com/watch?v=xxx","model_size":"small","language":"auto"}'

# Status
curl https://your-site.pages.dev/api/status/{job_id}

# History
curl https://your-site.pages.dev/api/history
```

- [ ] `/api/submit` returns 201
- [ ] `/api/status/:id` returns job data
- [ ] `/api/history` returns job list

---

## 📊 Monitoring

### What to Monitor

1. **Job Success Rate**
   - Check database for failed jobs
   - Review error messages

2. **Processing Times**
   - Track average completion time
   - Identify slow jobs

3. **GitHub Actions**
   - Check workflow run history
   - Review failed runs

4. **Kaggle Quota**
   - Monitor GPU hours used
   - 30 hours/week limit

5. **Cloudflare Limits**
   - D1: 5M reads, 100K writes/day
   - R2: 10GB storage
   - Pages: Unlimited requests

### Useful Queries

```sql
-- Failed jobs
SELECT * FROM jobs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;

-- Average processing time
SELECT AVG(processing_time) FROM jobs WHERE status = 'completed';

-- Jobs by status
SELECT status, COUNT(*) FROM jobs GROUP BY status;
```

---

## 🎉 Launch Checklist

Before announcing your app:

- [ ] All tests passing
- [ ] Multiple videos transcribed successfully
- [ ] Error handling works correctly
- [ ] UI is responsive on mobile
- [ ] No console errors
- [ ] README updated with production URL
- [ ] Documentation complete
- [ ] License file added
- [ ] Contributing guidelines added (optional)

---

## 🆘 Troubleshooting

### Issue: Jobs Stuck in "Pending"

**Cause:** GitHub Actions not triggering

**Fix:**
1. Check GitHub token has `repo` scope
2. Verify `GITHUB_REPO` format: `username/repository`
3. Check GitHub Actions logs
4. Verify workflow file syntax

### Issue: "WEBHOOK_INVALID" Error

**Cause:** Webhook signature mismatch

**Fix:**
1. Ensure `WEBHOOK_SECRET` same in Cloudflare and GitHub
2. Regenerate secret if needed
3. Update both locations

### Issue: Kaggle Notebook Fails

**Cause:** API credentials or quota

**Fix:**
1. Verify Kaggle API credentials
2. Check Kaggle quota (30 hours/week)
3. Review notebook logs in Kaggle
4. Test notebook manually

### Issue: R2 Upload Fails

**Cause:** Invalid credentials or permissions

**Fix:**
1. Verify R2 endpoint URL format
2. Check R2 API token permissions
3. Ensure bucket name correct
4. Test with Wrangler: `npx wrangler r2 object list transcriptions`

### Issue: CORS Errors

**Cause:** Origin mismatch

**Fix:**
1. Update `ALLOWED_ORIGIN` in Cloudflare secrets
2. Should match production URL exactly
3. No trailing slash
4. Include protocol (https://)

---

## 📝 Post-Deployment

- [ ] Add monitoring/analytics (optional)
- [ ] Set up error notifications (optional)
- [ ] Create user documentation
- [ ] Share with users
- [ ] Collect feedback
- [ ] Plan improvements

---

**Congratulations! Your Audio Transcription System is now live! 🎉**