import React, { useEffect } from 'react';
import { useStore } from '../App.jsx';

// BFS path finding
function findAllPaths(graph, startId, endId, maxPaths = 5) {
  if (!graph || !graph.nodes || !graph.edges) return [];

  const nodes = graph.nodes;
  const edges = graph.edges;

  if (!nodes[startId] || !nodes[endId]) return [];

  const paths = [];
  const queue = [[startId]];

  while (queue.length > 0 && paths.length < maxPaths) {
    const currentPath = queue.shift();
    const currentNode = currentPath[currentPath.length - 1];

    if (currentNode === endId) {
      paths.push(currentPath);
      continue;
    }

    if (currentPath.length >= 10) continue;

    const outgoing = edges.filter((e) => e.from === currentNode);
    for (const edge of outgoing) {
      if (!currentPath.includes(edge.to)) {
        queue.push([...currentPath, edge.to]);
      }
    }
  }

  paths.sort((a, b) => a.length - b.length);
  return paths;
}

function PathSelector() {
  const {
    graph,
    selectedStart,
    selectedEnd,
    foundPaths,
    selectedPath,
    setFoundPaths,
    setSelectedPath,
    clearSelection,
  } = useStore();

  // Find paths when start and end are selected
  useEffect(() => {
    if (selectedStart && selectedEnd && graph) {
      const paths = findAllPaths(graph, selectedStart, selectedEnd);
      setFoundPaths(paths);
      if (paths.length > 0) {
        setSelectedPath(paths[0]);
      }
    }
  }, [selectedStart, selectedEnd, graph, setFoundPaths, setSelectedPath]);

  const getNodeLabel = (nodeId) => {
    if (!graph || !graph.nodes) return nodeId;
    return graph.nodes[nodeId]?.label || nodeId;
  };

  return (
    <div className="path-selector">
      <h3>Path Selection</h3>

      <div className="selection-status">
        <div className="selection-item">
          <span className="label">Start:</span>
          <span className={`value ${selectedStart ? 'selected' : ''}`}>
            {selectedStart ? getNodeLabel(selectedStart) : 'Click a node'}
          </span>
        </div>
        <div className="selection-item">
          <span className="label">End:</span>
          <span className={`value ${selectedEnd ? 'selected' : ''}`}>
            {selectedEnd ? getNodeLabel(selectedEnd) : 'Click another node'}
          </span>
        </div>
      </div>

      {selectedStart && (
        <button className="btn-secondary btn-small" onClick={clearSelection}>
          Clear Selection
        </button>
      )}

      {foundPaths.length > 0 && (
        <div className="paths-list">
          <h4>Found Paths ({foundPaths.length})</h4>
          {foundPaths.map((path, index) => (
            <button
              key={index}
              className={`path-option ${path === selectedPath ? 'active' : ''}`}
              onClick={() => setSelectedPath(path)}
            >
              <span className="path-number">Path {index + 1}</span>
              <span className="path-length">{path.length} steps</span>
              <div className="path-preview">
                {path.map((nodeId, i) => (
                  <span key={nodeId}>
                    {i > 0 && ' → '}
                    {getNodeLabel(nodeId)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedStart && selectedEnd && foundPaths.length === 0 && (
        <div className="no-paths">
          No paths found between selected nodes
        </div>
      )}
    </div>
  );
}

export default PathSelector;
