# React Flowchart Generator

Generate interactive flowcharts from React applications by analyzing React Router configurations and navigation components.

## Features

- Scans React applications for routes and navigation links
- Analyzes React Router v6 configurations
- Detects `<Link>`, `<NavLink>`, and `navigate()` calls
- Generates interactive HTML flowcharts using Mermaid.js
- Supports JSX and TypeScript files
- Handles dynamic routes with parameters
- Color-coded node types (pages, dashboards, auth, errors)

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```bash
# Scan demo app (default)
node src/index.js

# Scan a specific directory
node src/index.js ./path/to/react/src

# Specify output file
node src/index.js ./path/to/react/src output.html
```

### Default Behavior

- Source directory: `./demo/src`
- Output file: `flowchart.html`

### Examples

```bash
# Scan your React app
node src/index.js ./my-app/src my-app-flowchart.html

# Use with npx (after global install)
npx react-flowchart-generator ./src
```

## How It Works

1. **Scanner**: Parses React files using Babel AST to extract:
   - Route definitions from `<Route>` components
   - Navigation links from `<Link>` and `<NavLink>`
   - Programmatic navigation from `navigate()` calls

2. **Graph Builder**: Converts scanner output into a graph:
   - Creates nodes from routes
   - Creates edges from navigation links
   - Infers source components from filenames

3. **Visualizer**: Generates output:
   - Converts graph to Mermaid syntax
   - Wraps in responsive HTML template
   - Includes Mermaid.js via CDN

## Testing

```bash
# Run all tests
npm test
```

## Project Structure

```
react-flowchart-generator/
├── src/
│   ├── scanner.js      # AST extraction of routes/links
│   ├── graph.js        # Graph data structure builder
│   ├── visualizer.js   # Mermaid + HTML generation
│   └── index.js        # CLI entry point
├── test/
│   ├── scanner.test.js
│   ├── graph.test.js
│   ├── visualizer.test.js
│   ├── integration.test.js
│   └── fixtures/       # Test fixtures
└── demo/               # Demo React app
    └── src/
        ├── pages/      # Page components
        └── routes.jsx  # Route configuration
```

## Known Limitations

- **Static analysis only**: Does not execute code, so dynamic values are not resolved
- **React Router v6 focus**: Optimized for React Router v6 patterns
- **Conventional naming expected**: Best results with standard file naming (PascalCase components)
- **Dynamic routes**: Routes with parameters (`:id`) may show as isolated nodes
- **Conditional rendering**: Not fully analyzed; only extracts literal paths

## Node Types

The flowchart uses different colors and shapes for different page types:

- **Regular Page** (gray): Standard pages
- **Dashboard** (blue): Pages with "dashboard" or "admin" in path
- **Auth Page** (green): Pages with "auth", "login", or "signup"
- **Error Page** (red): 404/NotFound pages and wildcard routes

## Output

The generated HTML file includes:

- Interactive flowchart with zoom/pan
- Node and edge statistics
- Generation timestamp
- Legend for node types
- Responsive design

## Dependencies

- `@babel/parser` - AST parsing
- `@babel/traverse` - AST traversal
- Mermaid.js (CDN) - Flowchart rendering

## Future Enhancements

- Interactive mode with clickable nodes
- Multi-framework support (Vue, Svelte)
- Live reload mode
- Export to PNG/PDF/SVG
- Test coverage overlay
- Branch comparison mode

## License

MIT
