# React Flowchart Generator

Generate interactive flowcharts from React applications by analyzing React Router configurations and navigation components.

## Features

- **AST Analysis**: Scans React applications using Babel parser to extract routes and navigation
- **Interactive Visualization**: React Flow-based flowchart with pan, zoom, and minimap
- **Path Finding**: BFS algorithm to find navigation paths between pages
- **Test Generation**: Generate Playwright, Cypress, or Gherkin test code
- **Planning Mode**: Draft hypothetical pages and connections before implementing
- **Mobile Responsive**: Touch-friendly UI that works on all devices

## Quick Start

### Installation

```bash
npm install
```

### CLI Usage

Generate a static HTML flowchart:

```bash
npm start [source-dir] [output-file]

# Examples:
npm start ./src flowchart.html
npm start ./demo/src output.html
```

### Web Application

Start the development server:

```bash
npm run dev
```

Then open http://localhost:3001 in your browser.

## Architecture

```
react-flowchart-generator/
├── src/
│   ├── core/           # Business logic (pure functions)
│   │   ├── scanner.js      # AST parsing for routes/links
│   │   ├── graph.js        # Graph building
│   │   ├── test-generator.js # Test code generation
│   │   ├── visualizer.js   # Mermaid HTML generation
│   │   └── utils.js        # Utility functions
│   ├── ui/             # React frontend
│   │   ├── App.jsx         # Main application with Zustand store
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   └── styles/         # CSS styles
│   ├── server/         # Express backend
│   │   ├── index.js        # API endpoints
│   │   ├── file-system.js  # Project scanning
│   │   └── test-runner.js  # Playwright execution
│   └── cli/            # Command-line interface
│       └── index.js
├── test/               # Test suite
│   ├── core/           # Unit tests
│   ├── fixtures/       # Test fixtures
│   └── e2e/            # Integration tests
└── demo/               # Demo React application
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/projects | List React projects |
| POST | /api/projects/scan | Scan a project |
| GET | /api/projects/:id | Get cached scan |
| POST | /api/projects/validate | Validate project path |
| POST | /api/tests/run | Execute Playwright test |
| DELETE | /api/cache | Clear scan cache |

### Core Functions

#### Scanner

```javascript
import { scanProject } from './src/core/scanner.js';

const result = scanProject('./src');
// Returns: { files, routes, links }
```

#### Graph Builder

```javascript
import { buildGraph } from './src/core/graph.js';

const graph = buildGraph(scanResult);
// Returns: { nodes: Map, edges: Array }
```

#### Test Generator

```javascript
import { findAllPaths, generatePlaywrightTest } from './src/core/test-generator.js';

const paths = findAllPaths(graph, 'home', 'settings');
const testCode = generatePlaywrightTest(paths[0], graph);
```

## Supported Patterns

The scanner detects these navigation patterns:

- **Route Definitions**: `<Route path="/" element={<Home />} />`
- **Link Components**: `<Link to="/about">About</Link>`
- **NavLink Components**: `<NavLink to="/dashboard">Dashboard</NavLink>`
- **Programmatic Navigation**: `navigate('/settings')`
- **Button Handlers**: `<button onClick={() => navigate('/profile')}>Profile</button>`
- **Form Submissions**: `<form onSubmit={() => navigate('/success')}>`

## Scripts

```bash
npm test          # Run all tests
npm test:core     # Run core unit tests
npm start         # Run CLI
npm run dev       # Start dev server
npm run build     # Build for production
```

## Test Coverage

- 120+ tests covering core functionality
- Unit tests for scanner, graph, visualizer, utils
- Integration tests for full pipeline
- File system and API tests

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari/Chrome

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

## License

MIT
