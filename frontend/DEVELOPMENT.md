"# Frontend Development Guide

## Prerequisites
- Node.js 18+ and npm
- Backend API running on http://localhost:8787

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
# Using the helper script
chmod +x start-dev.sh
./start-dev.sh

# Or directly
npm run dev
```

The frontend will be available at: http://localhost:5173

## Development Configuration

### Environment Variables
Create `.env.development` file:
```env
VITE_API_BASE=http://localhost:8787
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0
```

### Proxy Configuration
The frontend uses Vite proxy to forward API requests:
- `/api/*` → `http://localhost:8787/*`
- Configured in `vite.config.ts`

## Project Structure
```
src/
├── components/     # Reusable UI components
│   ├── common/    # Basic components (Button, Input, etc.)
│   └── JobForm/   # Main job submission form
├── pages/         # Application pages
│   ├── StatusPage.tsx    # Job status tracking
│   └── PlayerPage.tsx    # Transcript player with dual mode
├── hooks/         # Custom React hooks
│   └── usePolling.ts     # Polling hook for real-time updates
├── utils/         # Utility functions
│   ├── api.ts            # API client
│   ├── validators.ts     # Input validation
│   └── formatters.ts     # Data formatting
├── types/         # TypeScript definitions
└── index.css      # Global styles
```

## Key Features

### 1. Dual Mode Transcript Player
- **Sentence Mode**: Highlight per segment
- **Karaoke Mode**: Word-level highlighting with audio sync

### 2. Real-time Status Updates
- Polling every 3 seconds
- Auto-redirect on completion
- Error handling with retry

### 3. Form Validation
- YouTube URL validation
- Model size and language selection
- User-friendly error messages

## Common Issues & Solutions

### 1. API Connection Failed
**Error**: `Network error occurred` or CORS errors
**Solution**: 
- Ensure backend is running on http://localhost:8787
- Check proxy configuration in `vite.config.ts`
- Verify `.env.development` has correct API_BASE

### 2. Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules/.vite
npm run build
```

### 3. TypeScript Errors
```bash
# Check for type errors
npx tsc --noEmit
```

## Building for Production
```bash
npm run build
```
Output will be in `dist/` folder.

## Testing
```bash
# Coming soon: Unit tests with Jest + React Testing Library
```

## Code Style
- Use TypeScript strict mode
- Follow React hooks rules
- Use Tailwind CSS for styling
- Export components from `index.ts` files
"