# 🎤 Audio Transcription System

**Serverless YouTube video transcription with word-level audio synchronization**

Powered by Cloudflare, Kaggle, and faster-whisper.

---

## ✨ Features

- **Karaoke-style word highlighting** - Words light up as audio plays
- **Click-to-seek** - Jump to any word timestamp instantly  
- **GPU-accelerated** - 4x faster than OpenAI Whisper
- **Multiple formats** - JSON, SRT, TXT
- **99+ languages** - Auto-detection supported
- **100% Free** - Runs on free tiers

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (free)
- GitHub account (free)
- Kaggle account (free)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/audio-transcription-system.git
cd audio-transcription-system
```

### 2. Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Setup Environment Variables

```bash
# Copy example env files
cp .env.example .env
cp .env.example .dev.vars

# Edit .dev.vars with your values
nano .dev.vars
```

Required variables:
```env
ALLOWED_ORIGIN=http://localhost:5173
GITHUB_TOKEN=ghp_your_github_token
GITHUB_REPO=username/repository
WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_URL=http://localhost:8788
```

### 4. Setup Database

```bash
# Create D1 database
npx wrangler d1 create transcriptions-db

# Copy the database ID to wrangler.toml

# Run migrations (local)
npx wrangler d1 execute transcriptions-db --local --file=database/schema.sql
```

### 5. Run Development Servers

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 2 - Backend:**
```bash
npx wrangler pages dev frontend/dist --local --port 8788 --binding DB=transcriptions-db
```

**Open:** http://localhost:5173

---

## 📦 Production Deployment

### Step 1: Setup Cloudflare

1. **Create D1 Database:**
```bash
npx wrangler d1 create transcriptions-db
# Copy database_id to wrangler.toml
```

2. **Create R2 Bucket:**
```bash
npx wrangler r2 bucket create transcriptions
```

3. **Run Database Migration:**
```bash
npx wrangler d1 execute transcriptions-db --file=database/schema.sql
```

4. **Set Cloudflare Secrets:**
```bash
npx wrangler pages secret put ALLOWED_ORIGIN
# Enter: https://yourdomain.com

npx wrangler pages secret put GITHUB_TOKEN
# Enter: your GitHub PAT

npx wrangler pages secret put GITHUB_REPO
# Enter: username/repository

npx wrangler pages secret put WEBHOOK_SECRET
# Generate: openssl rand -hex 32

npx wrangler pages secret put WEBHOOK_URL
# Enter: https://yourdomain.com
```

### Step 2: Setup GitHub Secrets

Go to: `Settings > Secrets and variables > Actions > New repository secret`

Required secrets:
- `KAGGLE_USERNAME` - Your Kaggle username
- `KAGGLE_KEY` - Kaggle API key (from Account > API > Create New Token)
- `WEBHOOK_SECRET` - Same as Cloudflare
- `R2_ENDPOINT` - `https://account_id.r2.cloudflarestorage.com`
- `R2_ACCESS_KEY` - R2 API access key
- `R2_SECRET_KEY` - R2 API secret key
- `R2_BUCKET` - `transcriptions`

### Step 3: Deploy

```bash
# Build and deploy
npm run build
npm run deploy

# Or with Cloudflare dashboard
# Connect your GitHub repo and deploy
```

---

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │  ← User submits YouTube URL
│  (Cloudflare)   │
└────────┬────────┘
         │ POST /api/submit
         ↓
┌─────────────────┐
│  Pages Function │  ← Creates job, triggers workflow
│  (Serverless)   │
└────────┬────────┘
         │ GitHub API
         ↓
┌─────────────────┐
│ GitHub Actions  │  ← Orchestrates processing
└────────┬────────┘
         │ Kaggle API
         ↓
┌─────────────────┐
│ Kaggle Notebook │  ← GPU transcription
│  (T4/P100 GPU)  │
└────────┬────────┘
         │
         ├─ yt-dlp download
         ├─ faster-whisper transcribe
         ├─ Upload to R2
         └─ Webhook callback
         
         ↓
┌─────────────────┐
│  Job Completed  │  ← User views transcript
│  with Results   │
└─────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 (S3-compatible) |
| Orchestration | GitHub Actions |
| Processing | Kaggle Notebooks (GPU) |
| AI Model | faster-whisper |
| Audio Download | yt-dlp |

---

## 📁 Project Structure

```
audio-transcription-system/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Reusable UI components
│   │   │   └── JobForm/          # Job submission form
│   │   ├── pages/
│   │   │   ├── StatusPage.tsx    # Job status polling
│   │   │   └── PlayerPage.tsx    # Audio player + transcript
│   │   ├── hooks/
│   │   │   └── usePolling.ts     # Custom polling hook
│   │   ├── utils/
│   │   │   ├── api.ts            # API client
│   │   │   ├── validators.ts     # Input validation
│   │   │   └── formatters.ts     # Display formatters
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript types
│   │   ├── App.tsx               # Main app + routing
│   │   └── main.tsx              # Entry point
│   ├── functions/
│   │   ├── _middleware.ts        # CORS handler
│   │   └── api/
│   │       ├── submit.ts         # POST /api/submit
│   │       ├── status/[id].ts    # GET /api/status/:id
│   │       ├── webhook.ts        # POST /api/webhook
│   │       └── history.ts        # GET /api/history
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── database/
│   └── schema.sql                # D1 database schema
├── kaggle/
│   └── transcription_notebook.py # Python processing script
├── .github/
│   └── workflows/
│       └── transcription.yml     # GitHub Actions workflow
├── wrangler.toml                 # Cloudflare configuration
├── .env.example                  # Environment template
└── package.json                  # Root package.json
```

---

## 🎯 API Endpoints

### `POST /api/submit`
Submit new transcription job

**Request:**
```json
{
  "video_url": "https://youtube.com/watch?v=xxx",
  "model_size": "medium",
  "language": "auto"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "pending",
    "created_at": 1706553600
  }
}
```

### `GET /api/status/:id`
Get job status

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "transcript_url": "https://...",
    "audio_url": "https://...",
    ...
  }
}
```

### `GET /api/history`
List all jobs with pagination

**Query Params:**
- `limit` (default: 20, max: 100)
- `offset` (default: 0)

---

## 🔧 Development Commands

```bash
# Frontend dev server
npm run dev:frontend

# Backend dev server (after building frontend)
npm run dev:backend

# Build frontend
npm run build

# Deploy to Cloudflare
npm run deploy

# Database commands
npm run db:create
npm run db:migrate
npm run db:migrate:local
```

---

## 🐛 Troubleshooting

### CORS Errors
Make sure `ALLOWED_ORIGIN` in `.dev.vars` matches your frontend URL:
```env
ALLOWED_ORIGIN=http://localhost:5173
```

### Database Not Found
Run the local migration:
```bash
npx wrangler d1 execute transcriptions-db --local --file=database/schema.sql
```

### GitHub Actions Not Triggering
1. Check GitHub token has `repo` scope
2. Verify `GITHUB_REPO` format is `username/repository`
3. Check GitHub Actions secrets are set

### Kaggle Notebook Fails
1. Verify Kaggle API credentials
2. Check Kaggle quota (30 hours/week GPU)
3. Review notebook logs in Kaggle dashboard

---

## 📊 Performance

### Processing Speed (Kaggle T4 GPU)

| Video Length | Model | Time |
|-------------|-------|------|
| 5 min | medium | ~30s |
| 15 min | medium | ~1.5 min |
| 30 min | medium | ~3 min |
| 60 min | medium | ~6 min |
| 60 min | large-v3 | ~12 min |

### Cost (Free Tier)

- Cloudflare Pages: **Free** (unlimited)
- Cloudflare D1: **Free** (5M reads, 100K writes/month)
- Cloudflare R2: **Free** (10GB storage)
- Kaggle GPU: **Free** (30 hours/week)
- GitHub Actions: **Free** (2000 min/month)

**Total: $0/month** 🎉

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 🙏 Acknowledgments

- [faster-whisper](https://github.com/guillaumekln/faster-whisper) - Optimized Whisper implementation
- [OpenAI Whisper](https://github.com/openai/whisper) - Original AI model
- [Cloudflare](https://www.cloudflare.com) - Serverless infrastructure
- [Kaggle](https://www.kaggle.com) - Free GPU compute

---

Built with ❤️ using serverless technologies