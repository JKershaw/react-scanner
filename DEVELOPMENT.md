# Development Guide

## Getting Started

This application requires **TWO servers** to run:
1. **API Server** (port 3001) - Handles project scanning and graph generation
2. **Vite Dev Server** (port 3000) - Serves the React frontend and proxies API calls

## Running the Application

### Option 1: Run Both Servers (Recommended)
```bash
npm run dev:all
```
This runs both the API server and Vite dev server together.

### Option 2: Run Servers Separately
If you prefer separate terminal windows:

**Terminal 1 - API Server:**
```bash
npm run dev:api
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Common Issues

### "http proxy error: /api/projects/scan"
This error means the API server isn't running. Make sure to run both servers as described above.

### Port already in use
If port 3000 or 3001 is already in use, you'll need to:
1. Kill the existing processes: `pkill -f "node.*server"`
2. Try running the servers again

## Testing

Run all tests:
```bash
npm test
```

Run E2E tests:
```bash
npm run test:browser
```

## Architecture

- `/src/ui` - React frontend components
- `/src/server` - Express API server
- `/src/core` - Core scanning and graph logic
- `/demo` - Demo React app for testing