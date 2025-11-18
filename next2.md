# MVP Implementation Guide: React Flowchart Test Platform

## MVP Definition

**Core User Journey:**
1. Select a React project folder
2. Visualize complete site structure as interactive flowchart
3. Click two nodes → generate test cases
4. Draft new features (nodes/edges) in "planning mode"
5. Export tests as Playwright specs
6. Run tests and see results in UI

**Success Criteria:**
- Works on demo app, the tool itself, and 1 real-world project
- Mobile + desktop responsive
- All features tested
- Clean, maintainable codebase
- 5-minute time-to-value for new users

---

## Project Restructure

```
react-flowchart-generator/
├── src/
│   ├── core/                    # Business logic (pure functions)
│   │   ├── scanner.js
│   │   ├── graph.js
│   │   ├── path-finder.js       # NEW: BFS/DFS algorithms
│   │   ├── test-generator.js
│   │   └── spec-parser.js       # NEW: Parse Gherkin specs
│   ├── ui/                      # Frontend (React)
│   │   ├── App.jsx              # NEW: Main application
│   │   ├── components/
│   │   │   ├── ProjectSelector.jsx
│   │   │   ├── FlowchartViewer.jsx
│   │   │   ├── PathSelector.jsx
│   │   │   ├── TestGenerator.jsx
│   │   │   ├── PlanningMode.jsx
│   │   │   └── TestRunner.jsx
│   │   ├── hooks/
│   │   │   ├── useProject.js
│   │   │   ├── useFlowchart.js
│   │   │   └── useTests.js
│   │   └── styles/
│   │       └── app.css
│   ├── server/                  # Simple Node server
│   │   └── index.js             # File system access, test execution
│   └── cli/                     # Existing CLI tool
│       └── index.js
├── test/
│   ├── core/                    # Unit tests
│   ├── ui/                      # Component tests
│   └── e2e/                     # Integration tests
├── demo/                        # Existing demo app
├── public/                      # Static assets
│   └── index.html
└── package.json
```

---

## Iteration 1: Project Selector & File Management

**Goal:** User can choose any React project and scan it

### Backend (TDD)

**Test:** `test/server/file-system.test.js`
```javascript
// Test: listProjects returns array of valid project directories
// Test: scanProject returns file structure
// Test: handles permission errors gracefully
// Test: filters out non-React projects
// Test: caches scan results for performance
```

**Implementation:** `src/server/file-system.js`
- `listProjects(rootDir)` → array of project paths
- `scanProject(projectPath)` → full scan results
- `validateProject(path)` → checks for React markers (package.json with react)
- Cache layer (in-memory Map, invalidate on file change)

**API endpoints:** `src/server/index.js`
```
GET  /api/projects          → list available projects
POST /api/projects/scan     → scan specific project
GET  /api/projects/:id      → get cached scan results
```

### Frontend (TDD)

**Test:** `test/ui/ProjectSelector.test.jsx`
```javascript
// Test: renders list of projects
// Test: shows loading state while scanning
// Test: handles empty project list
// Test: clicking project triggers scan
// Test: shows scan progress
// Test: displays error states
```

**Implementation:** `src/ui/components/ProjectSelector.jsx`
- Dropdown or card grid of available projects
- "Add Project" button → file picker dialog
- Recent projects list (localStorage)
- Scan progress indicator
- Mobile: full-screen selector, desktop: sidebar

**Acceptance:**
- Can select demo project
- Can select tool's own codebase
- Can add external project via file picker
- Scans complete in <5 seconds for small projects
- Mobile UI is thumb-friendly

---

## Iteration 2: Interactive Flowchart Viewer

**Goal:** Replace static Mermaid with interactive React Flow

### Dependencies
Add: `reactflow` (for interactive graphs), `zustand` (for state)

### Backend Enhancement (TDD)

**Test:** `test/core/graph.test.js` (enhance existing)
```javascript
// Test: graph includes node positions (auto-layout)
// Test: graph includes edge routing data
// Test: nodes have metadata (file path, line numbers)
// Test: supports hierarchical layout
```

**Implementation:** `src/core/graph.js`
- Add `calculateLayout(graph)` → positions for nodes
- Use Dagre for auto-layout algorithm
- Include metadata in nodes: `{id, label, position, data: {...}}`

### Frontend (TDD)

**Test:** `test/ui/FlowchartViewer.test.jsx`
```javascript
// Test: renders nodes and edges
// Test: nodes are clickable
// Test: supports pan and zoom
// Test: highlights nodes on hover
// Test: shows node details on click
// Test: responsive layout (stacks controls on mobile)
// Test: keyboard navigation (arrow keys, +/-)
```

**Implementation:** `src/ui/components/FlowchartViewer.jsx`
- React Flow canvas
- Custom node components (show page name, icon, status)
- Controls: zoom in/out, fit view, reset
- Node types: page (rectangle), modal (rounded), error (diamond)
- Edge types: navigation (solid), conditional (dashed)
- Minimap for large graphs
- Mobile: simplified controls, gesture support

**Styling:** `src/ui/styles/flowchart.css`
- Clean, minimal design
- High contrast for accessibility
- Responsive breakpoints (mobile: <768px, tablet: 768-1024px, desktop: >1024px)
- Touch-friendly targets (min 44px)

**Acceptance:**
- Flowchart is interactive and smooth (60fps)
- Works on phone screens (tested on real device)
- Can zoom and pan comfortably
- Node details accessible via click

---

## Iteration 3: Path Selection & Test Generation

**Goal:** Click start node → click end node → generate test

### Core Logic (TDD)

**Test:** `test/core/path-finder.test.js`
```javascript
// Test: finds shortest path between two nodes
// Test: finds all paths (up to max length)
// Test: handles cycles (doesn't infinite loop)
// Test: returns empty array if no path exists
// Test: ranks paths by simplicity (fewer steps = better)
```

**Implementation:** `src/core/path-finder.js`
- `findPath(graph, startId, endId)` → array of node IDs
- `findAllPaths(graph, startId, endId, maxLength=10)` → array of paths
- BFS for shortest path
- DFS with depth limit for all paths
- Cycle detection

**Test:** `test/core/test-generator.test.js` (enhance existing)
```javascript
// Test: generates Playwright test from simple path
// Test: includes assertions at each step
// Test: handles authentication requirements
// Test: includes setup/teardown
// Test: generates readable test names
// Test: handles dynamic routes (/user/:id)
```

**Implementation:** `src/core/test-generator.js` (enhance)
- `generateTest(path, options)` → Playwright code string
- Smart assertions: URL checks, element existence
- Auto-detect authentication needs (protected routes)
- Generate test data (forms, inputs)
- Template system for clean code output

### Frontend (TDD)

**Test:** `test/ui/PathSelector.test.jsx`
```javascript
// Test: tracks selected start/end nodes
// Test: shows "Generate Test" button when both selected
// Test: displays found paths
// Test: user can choose from multiple paths
// Test: shows path preview in flowchart
// Test: mobile: drawer UI for path selection
```

**Implementation:** `src/ui/components/PathSelector.jsx`
- Mode toggle: "Select Start" → "Select End" → "Review"
- Visual feedback: green border (start), red border (end)
- Path visualization: highlight path in flowchart
- Path comparison: side-by-side view of multiple paths
- Mobile: bottom sheet with path details

**Test:** `test/ui/TestGenerator.test.jsx`
```javascript
// Test: shows generated test code
// Test: syntax highlighting
// Test: copy to clipboard button
// Test: save to file
// Test: run test button
// Test: edit test inline
```

**Implementation:** `src/ui/components/TestGenerator.jsx`
- Code editor (use `react-simple-code-editor` or `textarea` with syntax highlighting)
- Action buttons: Copy, Save, Run
- Test results display (after running)
- Mobile: full-screen editor mode

**Acceptance:**
- Path selection is intuitive (tested with non-developer)
- Generated tests are readable
- Can generate test in <2 clicks after selection
- Mobile experience is smooth

---

## Iteration 4: Planning Mode

**Goal:** Draft new features as hypothetical nodes/edges

### Core Logic (TDD)

**Test:** `test/core/planning.test.js`
```javascript
// Test: addPlannedNode adds node with 'planned' flag
// Test: planned nodes don't affect real graph
// Test: can convert planned node to spec
// Test: export planned nodes as Gherkin
// Test: validate planned connections
```

**Implementation:** `src/core/planning.js`
- `addPlannedNode(graph, node)` → returns new graph with planned node
- `addPlannedEdge(graph, edge)` → returns new graph with planned edge
- `exportPlannedFeatures(graph)` → Gherkin format
- `validatePlannedPath(graph, path)` → checks for logical issues
- Planned items stored separately, merged for display

### Frontend (TDD)

**Test:** `test/ui/PlanningMode.test.jsx`
```javascript
// Test: toggle planning mode on/off
// Test: add new node via double-click
// Test: add new edge by dragging
// Test: edit node details (name, type, description)
// Test: planned items have distinct visual style
// Test: export planned features button
// Test: mobile: form-based node creation
```

**Implementation:** `src/ui/components/PlanningMode.jsx`
- Toggle switch: "Planning Mode" (off by default)
- When on: double-click canvas → add node
- Drag from node edge → create connection
- Planned nodes: dashed border, different color
- Edit panel: click node → edit name, type, route, description
- Export button → downloads .feature file
- Mobile: tap to add, form for details

**Acceptance:**
- Can draft a new feature flow in <5 minutes
- Planned vs real nodes clearly distinguished
- Export generates valid Gherkin specs
- Non-technical users can use planning mode

---

## Iteration 5: Test Execution Integration

**Goal:** Run tests from UI and see results

### Backend (TDD)

**Test:** `test/server/test-runner.test.js`
```javascript
// Test: executes Playwright test file
// Test: streams output in real-time
// Test: handles test failures gracefully
// Test: returns structured results
// Test: supports concurrent test runs
// Test: cleans up after execution
```

**Implementation:** `src/server/test-runner.js`
- `runTest(testPath, options)` → returns stream/promise
- Execute via child_process
- Parse Playwright JSON reporter output
- Stream logs via WebSocket
- Timeout handling (kill after 5 minutes)

**API endpoints:**
```
POST /api/tests/run        → execute test file
GET  /api/tests/:id/status → check run status
WS   /api/tests/:id/stream → live output stream
GET  /api/tests/:id/results→ final results
```

### Frontend (TDD)

**Test:** `test/ui/TestRunner.test.jsx`
```javascript
// Test: shows run button on generated test
// Test: displays running status
// Test: streams output logs
// Test: shows pass/fail results
// Test: highlights failing steps in flowchart
// Test: allows re-run
// Test: mobile: collapsible output panel
```

**Implementation:** `src/ui/components/TestRunner.jsx`
- "Run Test" button with loading state
- Output console (scrollable, auto-scroll to bottom)
- Results summary: X passed, Y failed, time elapsed
- Failed step highlighting: click to jump to node in flowchart
- Mobile: drawer from bottom with results

**Acceptance:**
- Can run generated test with one click
- See results within seconds
- Clear indication of success/failure
- Failed tests point to problematic nodes

---

## Iteration 6: Mobile Optimization

**Goal:** All features work smoothly on mobile devices

### Responsive Design (TDD via visual regression)

**Test:** `test/ui/responsive.test.js`
```javascript
// Test: all screens render at 375px width (mobile)
// Test: all screens render at 768px width (tablet)
// Test: all screens render at 1920px width (desktop)
// Test: touch targets are minimum 44px
// Test: text is readable (min 16px)
// Test: no horizontal scroll on mobile
```

**Implementation:** CSS refactoring
- Mobile-first approach
- Use CSS Grid for layout (collapses to single column)
- Touch-friendly buttons (44px min)
- Hamburger menu for navigation
- Bottom navigation bar (common mobile pattern)
- Gestures: pinch to zoom, swipe to pan

**Component adjustments:**
- `ProjectSelector`: Full-screen on mobile, sidebar on desktop
- `FlowchartViewer`: Full canvas on mobile, pan with touch
- `PathSelector`: Bottom sheet on mobile, side panel on desktop
- `TestGenerator`: Full-screen editor on mobile
- `TestRunner`: Collapsible drawer on mobile

**Test on real devices:**
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)

**Acceptance:**
- All features accessible on 375px screen
- No pinch-to-zoom required for text
- All interactions work with touch
- Performance: smooth scrolling, no lag

---

## Iteration 7: Code Refactoring & Polish

**Goal:** Clean, maintainable, production-quality code

### Backend Refactoring

**Tasks:**
1. Extract common utilities → `src/core/utils.js`
2. Add JSDoc comments to all functions
3. Consistent error handling (custom error classes)
4. Logging system (structured logs, log levels)
5. Configuration management (environment variables)
6. Security: input validation, path traversal prevention

**Test:** `test/core/utils.test.js`
```javascript
// Test: sanitizePath prevents directory traversal
// Test: validateRoute checks format
// Test: formatTestName handles special characters
```

### Frontend Refactoring

**Tasks:**
1. Extract shared hooks → `src/ui/hooks/`
2. Consistent prop types (PropTypes or TypeScript)
3. Error boundaries for graceful failures
4. Loading states for all async operations
5. Accessibility: ARIA labels, keyboard navigation
6. Performance: memoization, lazy loading

**Custom hooks:**
- `useProject()` → manages current project state
- `useFlowchart()` → manages graph data and layout
- `usePathSelection()` → manages start/end node selection
- `useTestExecution()` → manages test runs

**Accessibility checklist:**
- Keyboard navigation works everywhere
- Focus indicators visible
- Screen reader labels on all interactive elements
- Color contrast meets WCAG AA
- Error messages are clear

### Testing Refactoring

**Tasks:**
1. Increase coverage to 80%+
2. Add integration tests for full workflows
3. Add visual regression tests (if budget allows)
4. Smoke tests for critical paths

**Integration test:** `test/e2e/full-workflow.test.js`
```javascript
// Test: Select project → View flowchart → Select path → Generate test → Run test
```

**Acceptance:**
- Test coverage >80%
- No console warnings/errors
- All accessibility checks pass
- Code passes linter (ESLint + Prettier)

---

## Iteration 8: Self-Hosting & Documentation

**Goal:** Tool can analyze itself, comprehensive docs

### Self-Analysis

**Test:** `test/e2e/dogfooding.test.js`
```javascript
// Test: tool can scan its own codebase
// Test: generates flowchart of tool's UI
// Test: identifies circular dependencies
// Test: exports test for tool's own features
```

**Implementation:**
- Add tool's own `src/ui` as scannable project
- Handle non-standard routing (if any)
- Generate meta-test: test for the testing tool

### Documentation

**README.md:**
- Quick start (5-minute guide)
- Architecture overview
- API reference
- Troubleshooting guide
---

## Critical Success Factors

1. **Keep it simple**: Resist feature creep, nail the core workflow
2. **Test on real codebases**: Don't optimize for demo app only
3. **Mobile-first**: More users on phones than you think
4. **Dogfood it**: Use tool to build itself (meta!)
5. **Fast feedback loops**: Every iteration should be testable immediately

**The MVP is ready when:** A developer unfamiliar with the codebase can use it to understand a React app and generate working tests within 10 minutes.
