#!/bin/bash
# ⚡ COMPLETE FIX - Audio Transcription System
# Follow these steps EXACTLY

echo "🚀 Starting complete fix process..."
echo ""

# ============================================================================
# STEP 1: Clean Everything
# ============================================================================
echo "==================================================================="
echo "STEP 1: CLEAN INSTALL"
echo "==================================================================="
echo ""
echo "Run these commands:"
echo ""

cat << 'EOF'
# Navigate to project root
cd /path/to/audio-transcription-system

# Clean root
rm -rf node_modules package-lock.json

# Clean frontend
cd frontend
rm -rf node_modules package-lock.json dist
cd ..
EOF

echo ""
read -p "Press ENTER after completing Step 1..."
echo ""

# ============================================================================
# STEP 2: Update package.json Files
# ============================================================================
echo "==================================================================="
echo "STEP 2: UPDATE PACKAGE.JSON FILES"
echo "==================================================================="
echo ""
echo "Replace your package.json files with the corrected versions"
echo ""
echo "ROOT package.json:"
echo ""

cat << 'EOF'
{
  "name": "audio-transcription-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:all": "npm install && cd frontend && npm install",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "npx wrangler pages dev frontend/dist --port 8788 --local --binding DB=transcriptions-db",
    "build": "cd frontend && npm run build",
    "deploy": "npm run build && npx wrangler pages deploy frontend/dist",
    "db:create": "npx wrangler d1 create transcriptions-db",
    "db:migrate": "npx wrangler d1 execute transcriptions-db --file=database/schema.sql",
    "db:migrate:local": "npx wrangler d1 execute transcriptions-db --local --file=database/schema.sql"
  },
  "devDependencies": {
    "wrangler": "^3.80.0"
  }
}
EOF

echo ""
echo "FRONTEND package.json (frontend/package.json):"
echo ""

cat << 'EOF'
{
  "name": "audio-transcription-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
EOF

echo ""
read -p "Press ENTER after updating package.json files..."
echo ""

# ============================================================================
# STEP 3: Install Dependencies
# ============================================================================
echo "==================================================================="
echo "STEP 3: INSTALL DEPENDENCIES"
echo "==================================================================="
echo ""
echo "Run these commands:"
echo ""

cat << 'EOF'
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
EOF

echo ""
read -p "Press ENTER after installing dependencies..."
echo ""

# ============================================================================
# STEP 4: Verify TypeScript
# ============================================================================
echo "==================================================================="
echo "STEP 4: VERIFY TYPESCRIPT"
echo "==================================================================="
echo ""
echo "Run this command to verify TypeScript is installed:"
echo ""
echo "cd frontend && npx tsc --version"
echo ""
echo "Expected output: Version 5.x.x"
echo ""
read -p "Press ENTER after verifying..."
echo ""

# ============================================================================
# STEP 5: Build Frontend
# ============================================================================
echo "==================================================================="
echo "STEP 5: BUILD FRONTEND"
echo "==================================================================="
echo ""
echo "Run these commands:"
echo ""

cat << 'EOF'
cd frontend
npm run build
EOF

echo ""
echo "Expected output:"
echo ""
cat << 'EOF'
> audio-transcription-frontend@1.0.0 build
> tsc && vite build

vite v5.4.11 building for production...
✓ 150 modules transformed.
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-hash.css        8.15 kB │ gzip:  2.31 kB
dist/assets/index-hash.js       156.78 kB │ gzip: 50.89 kB
✓ built in 2.45s
EOF

echo ""
read -p "Press ENTER after successful build..."
echo ""

# ============================================================================
# STEP 6: Verify dist/ folder
# ============================================================================
echo "==================================================================="
echo "STEP 6: VERIFY BUILD OUTPUT"
echo "==================================================================="
echo ""
echo "Check that frontend/dist/ folder exists and contains:"
echo "  - index.html"
echo "  - assets/ folder with .js and .css files"
echo ""
echo "Run: ls -la frontend/dist/"
echo ""
read -p "Press ENTER after verifying..."
echo ""

# ============================================================================
# STEP 7: Deploy
# ============================================================================
echo "==================================================================="
echo "STEP 7: DEPLOY TO CLOUDFLARE"
echo "==================================================================="
echo ""
echo "Run this command from project root:"
echo ""
echo "npx wrangler pages deploy frontend/dist"
echo ""
echo "Or use the npm script:"
echo ""
echo "npm run deploy"
echo ""
read -p "Press ENTER to see deployment checklist..."
echo ""

# ============================================================================
# DEPLOYMENT CHECKLIST
# ============================================================================
echo "==================================================================="
echo "DEPLOYMENT CHECKLIST"
echo "==================================================================="
echo ""
echo "Before deploying, ensure:"
echo "  ✓ functions/ folder exists at ROOT (not in frontend/)"
echo "  ✓ functions/_middleware.ts exists"
echo "  ✓ functions/api/submit.ts exists"
echo "  ✓ functions/api/webhook.ts exists"
echo "  ✓ functions/api/history.ts exists"
echo "  ✓ functions/api/status/[id].ts exists"
echo "  ✓ wrangler.toml has correct database_id"
echo "  ✓ All Cloudflare secrets set"
echo "  ✓ All GitHub secrets set"
echo ""

# ============================================================================
# TROUBLESHOOTING
# ============================================================================
echo "==================================================================="
echo "TROUBLESHOOTING"
echo "==================================================================="
echo ""
echo "If 'tsc: command not found' STILL appears:"
echo ""
echo "OPTION 1 - Force install TypeScript:"
echo "  cd frontend"
echo "  npm install --save-dev typescript@5.6.3"
echo "  npm run build"
echo ""
echo "OPTION 2 - Use npx (modify frontend/package.json):"
echo '  "build": "npx tsc && vite build"'
echo ""
echo "OPTION 3 - Skip type check (NOT RECOMMENDED):"
echo '  "build": "vite build"'
echo ""

echo "🎉 Fix process complete!"