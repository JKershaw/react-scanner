# React Scanner

React Flowchart Generator - Analyzes React applications using AST parsing to generate interactive flowcharts showing navigation patterns.

## Development Setup

```bash
# Install dependencies
npm install

# Run development (requires two terminals)
npm run dev      # Frontend on port 3000
npm run dev:api  # Backend on port 3001
```

## Testing

```bash
npm test           # All tests
npm run test:core  # Core unit tests (120+ tests)
npm run test:e2e   # Integration tests
npm run test:browser  # Playwright E2E tests
```

Always run `npm test` before committing changes.

## Architecture

- **src/core/** - Pure business logic (scanner, graph, test-generator) - no framework dependencies
- **src/ui/** - React components with Zustand state management
- **src/server/** - Express API (port 3001)
- **src/cli/** - CLI entry point

Data flow: Scanner → Graph Builder → Visualizer/TestGenerator

## Code Style

- ES modules (`"type": "module"` in package.json)
- Use Node.js built-in test runner (`node:test`) for unit tests
- Playwright for browser E2E tests
- JSX for React components (.jsx extension)

## API Endpoints

Backend runs on port 3001, Vite proxies `/api` requests. Key endpoints:
- `GET /api/projects` - List React projects
- `POST /api/projects/scan` - Scan a project
- `POST /api/tests/run` - Execute Playwright tests

## Project Gotchas

- Scanner skips `node_modules`, `.git`, `dist`, `build`, `coverage` directories
- Scan results cached with 5-minute TTL
- Babel parser handles both CommonJS and ESM exports
- Demo project in `./demo/` is useful for testing scanner functionality
- Generated tests go to `.temp-tests/` directory (gitignored)

## CLI Usage

```bash
npm start [source-dir] [output-file]
# Example: npm start ./demo/src flowchart.html
```
