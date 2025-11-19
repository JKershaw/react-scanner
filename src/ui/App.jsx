import React from 'react';
import { create } from 'zustand';
import ProjectSelector from './components/ProjectSelector.jsx';
import D3ForceGraphStable from './components/D3ForceGraphStable.jsx';
import PathSelector from './components/PathSelector.jsx';
import TestGenerator from './components/TestGenerator.jsx';
import TestRunner from './components/TestRunner.jsx';
import PlanningMode from './components/PlanningMode.jsx';

// Global state store
export const useStore = create((set, get) => ({
  // Project state
  currentProject: null,
  projects: [],
  isLoading: false,
  error: null,

  // Graph state
  graph: null,
  nodes: [],
  edges: [],

  // Path selection state
  selectedStart: null,
  selectedEnd: null,
  foundPaths: [],
  selectedPath: null,

  // D3 Graph state
  selectedNodes: [],
  hoveredNode: null,

  // Planning mode state
  isPlanningMode: false,
  plannedNodes: [],
  plannedEdges: [],

  // Generated test
  generatedTest: null,

  // Actions
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setGraph: (graph) => {
    if (!graph) {
      set({ graph: null, nodes: [], edges: [] });
      return;
    }

    // Convert nodes object to array for React Flow
    const nodesArray = Object.entries(graph.nodes).map(([id, node]) => ({
      id,
      type: 'default',
      data: { label: node.label, ...node },
      position: { x: 0, y: 0 }, // Will be calculated by layout
    }));

    set({
      graph,
      nodes: nodesArray,
      edges: graph.edges.map((e, i) => ({
        id: `e${i}`,
        source: e.from,
        target: e.to,
        label: e.type,
        type: 'smoothstep',
        animated: e.type === 'navigate',
      })),
    });
  },

  setSelectedStart: (nodeId) => set({ selectedStart: nodeId, foundPaths: [], selectedPath: null }),
  setSelectedEnd: (nodeId) => set({ selectedEnd: nodeId }),
  setFoundPaths: (paths) => set({ foundPaths: paths }),
  setSelectedPath: (path) => set({ selectedPath: path }),

  clearSelection: () => set({
    selectedStart: null,
    selectedEnd: null,
    selectedNodes: [],
    foundPaths: [],
    selectedPath: null,
  }),

  togglePlanningMode: () => set((state) => ({ isPlanningMode: !state.isPlanningMode })),
  addPlannedNode: (node) => set((state) => ({
    plannedNodes: [...state.plannedNodes, node],
  })),
  addPlannedEdge: (edge) => set((state) => ({
    plannedEdges: [...state.plannedEdges, edge],
  })),

  setGeneratedTest: (test) => set({ generatedTest: test }),

  // D3 Graph actions
  setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
  setHoveredNode: (nodeId) => set({ hoveredNode: nodeId }),
}));

function App() {
  const { currentProject, graph, error } = useStore();

  return (
    <div className="app">
      <header className="app-header">
        <h1>React Flowchart Generator</h1>
        <ProjectSelector />
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => useStore.getState().setError(null)}>Dismiss</button>
        </div>
      )}

      <main className="app-main">
        {!currentProject ? (
          <div className="welcome">
            <h2>Welcome</h2>
            <p>Select a React project to visualize its navigation structure.</p>
          </div>
        ) : !graph ? (
          <div className="loading">Loading project...</div>
        ) : (
          <div className="workspace">
            <div className="flowchart-container">
              <D3ForceGraphStable />
            </div>
            <aside className="sidebar">
              <PathSelector />
              <TestGenerator />
              <TestRunner />
              <PlanningMode />
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
