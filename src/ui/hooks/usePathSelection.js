import { useCallback } from 'react';
import { useStore } from '../App.jsx';

/**
 * BFS path finding algorithm
 */
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

/**
 * Custom hook for path selection
 * @returns {Object} Path selection state and actions
 */
export function usePathSelection() {
  const {
    graph,
    selectedStart,
    selectedEnd,
    foundPaths,
    selectedPath,
    setSelectedStart,
    setSelectedEnd,
    setFoundPaths,
    setSelectedPath,
    clearSelection,
  } = useStore();

  const selectNode = useCallback((nodeId) => {
    if (!selectedStart) {
      setSelectedStart(nodeId);
    } else if (!selectedEnd && nodeId !== selectedStart) {
      setSelectedEnd(nodeId);

      // Find paths when both nodes are selected
      if (graph) {
        const paths = findAllPaths(graph, selectedStart, nodeId);
        setFoundPaths(paths);
        if (paths.length > 0) {
          setSelectedPath(paths[0]);
        }
      }
    } else {
      // Reset and start new selection
      setSelectedStart(nodeId);
      setSelectedEnd(null);
      setFoundPaths([]);
      setSelectedPath(null);
    }
  }, [graph, selectedStart, selectedEnd, setSelectedStart, setSelectedEnd, setFoundPaths, setSelectedPath]);

  const selectPath = useCallback((path) => {
    setSelectedPath(path);
  }, [setSelectedPath]);

  const getNodeLabel = useCallback((nodeId) => {
    if (!graph || !graph.nodes) return nodeId;
    return graph.nodes[nodeId]?.label || nodeId;
  }, [graph]);

  return {
    selectedStart,
    selectedEnd,
    foundPaths,
    selectedPath,
    selectNode,
    selectPath,
    clearSelection,
    getNodeLabel,
    hasSelection: !!selectedStart,
    hasFullSelection: !!selectedStart && !!selectedEnd,
  };
}
