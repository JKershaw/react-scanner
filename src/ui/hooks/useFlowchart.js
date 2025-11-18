import { useMemo } from 'react';
import { useStore } from '../App.jsx';

/**
 * Custom hook for flowchart state
 * @returns {Object} Flowchart state and computed values
 */
export function useFlowchart() {
  const {
    graph,
    nodes,
    edges,
    selectedStart,
    selectedEnd,
    selectedPath,
  } = useStore();

  // Compute statistics
  const stats = useMemo(() => {
    if (!graph || !graph.nodes) {
      return { nodeCount: 0, edgeCount: 0, pageCount: 0 };
    }

    const nodeCount = Object.keys(graph.nodes).length;
    const edgeCount = graph.edges?.length || 0;

    return {
      nodeCount,
      edgeCount,
      pageCount: nodeCount,
    };
  }, [graph]);

  // Get node by ID
  const getNode = (nodeId) => {
    if (!graph || !graph.nodes) return null;
    return graph.nodes[nodeId];
  };

  // Get edges from a node
  const getOutgoingEdges = (nodeId) => {
    if (!graph || !graph.edges) return [];
    return graph.edges.filter(e => e.from === nodeId);
  };

  // Get edges to a node
  const getIncomingEdges = (nodeId) => {
    if (!graph || !graph.edges) return [];
    return graph.edges.filter(e => e.to === nodeId);
  };

  // Check if a node is selected
  const isNodeSelected = (nodeId) => {
    return nodeId === selectedStart || nodeId === selectedEnd;
  };

  // Check if a node is in the selected path
  const isNodeInPath = (nodeId) => {
    return selectedPath && selectedPath.includes(nodeId);
  };

  return {
    graph,
    nodes,
    edges,
    stats,
    getNode,
    getOutgoingEdges,
    getIncomingEdges,
    isNodeSelected,
    isNodeInPath,
  };
}
