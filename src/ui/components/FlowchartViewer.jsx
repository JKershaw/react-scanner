import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import { useStore } from '../App.jsx';
import 'reactflow/dist/style.css';

// Layout algorithm using Dagre
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 172;
  const nodeHeight = 36;

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function FlowchartViewer() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    selectedStart,
    selectedEnd,
    selectedPath,
    setSelectedStart,
    setSelectedEnd,
    isPlanningMode,
  } = useStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Apply layout when nodes/edges change
  useEffect(() => {
    if (storeNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        storeNodes,
        storeEdges.map((e) => ({
          ...e,
          markerEnd: { type: MarkerType.ArrowClosed },
        }))
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [storeNodes, storeEdges, setNodes, setEdges]);

  // Update node styles based on selection
  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      let className = 'flowchart-node';
      let style = {};

      if (node.id === selectedStart) {
        className += ' node-start';
        style = { border: '3px solid #22c55e', background: '#dcfce7' };
      } else if (node.id === selectedEnd) {
        className += ' node-end';
        style = { border: '3px solid #ef4444', background: '#fee2e2' };
      } else if (selectedPath && selectedPath.includes(node.id)) {
        className += ' node-path';
        style = { border: '2px solid #3b82f6', background: '#dbeafe' };
      }

      return { ...node, className, style };
    });
  }, [nodes, selectedStart, selectedEnd, selectedPath]);

  // Update edge styles based on selected path
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      if (selectedPath) {
        const pathIndex = selectedPath.indexOf(edge.source);
        if (pathIndex !== -1 && selectedPath[pathIndex + 1] === edge.target) {
          return {
            ...edge,
            style: { stroke: '#3b82f6', strokeWidth: 3 },
            animated: true,
          };
        }
      }
      return edge;
    });
  }, [edges, selectedPath]);

  const onNodeClick = useCallback(
    (event, node) => {
      if (isPlanningMode) {
        // In planning mode, clicking shows node details
        return;
      }

      // Path selection mode
      if (!selectedStart) {
        setSelectedStart(node.id);
      } else if (!selectedEnd && node.id !== selectedStart) {
        setSelectedEnd(node.id);
      } else {
        // Reset selection
        setSelectedStart(node.id);
        setSelectedEnd(null);
      }
    },
    [selectedStart, selectedEnd, setSelectedStart, setSelectedEnd, isPlanningMode]
  );

  if (nodes.length === 0) {
    return (
      <div className="flowchart-empty">
        <p>No nodes to display</p>
      </div>
    );
  }

  return (
    <div className="flowchart-viewer">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
        minZoom={0.5}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === selectedStart) return '#22c55e';
            if (node.id === selectedEnd) return '#ef4444';
            if (selectedPath?.includes(node.id)) return '#3b82f6';
            return '#e2e8f0';
          }}
        />
      </ReactFlow>

      <div className="flowchart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#22c55e' }}></span>
          Start
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#ef4444' }}></span>
          End
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ background: '#3b82f6' }}></span>
          Path
        </div>
      </div>
    </div>
  );
}

export default FlowchartViewer;
