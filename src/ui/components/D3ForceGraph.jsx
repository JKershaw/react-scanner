import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { useStore } from '../App.jsx';
import GraphSearch from './GraphSearch.jsx';

const D3ForceGraph = forwardRef((props, ref) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);
  const nodesRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showLabels, setShowLabels] = useState(true);
  const [forceStrength, setForceStrength] = useState(-300);
  const [linkDistance, setLinkDistance] = useState(100);

  const {
    graph,
    selectedNodes,
    hoveredNode,
    setSelectedNodes,
    setHoveredNode,
    setError,
  } = useStore();

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Build and update the force-directed graph
  useEffect(() => {
    if (!graph || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Clear previous content
    svg.selectAll('*').remove();

    // Convert graph data to D3 format
    const nodes = Object.values(graph.nodes).map(node => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100
    }));

    const links = graph.edges.map(edge => ({
      ...edge,
      source: edge.from,
      target: edge.to
    }));

    // Create container for zoom
    const container = svg.append('g')
      .attr('class', 'graph-container');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody()
        .strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(30));

    simulationRef.current = simulation;

    // Add arrow markers for directed edges
    svg.append('defs').selectAll('marker')
      .data(['arrow', 'arrow-hover', 'arrow-selected'])
      .enter().append('marker')
      .attr('id', d => d)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => {
        if (d === 'arrow-hover') return '#ff6b6b';
        if (d === 'arrow-selected') return '#4ecdc4';
        return '#999';
      });

    // Draw links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)');

    // Draw link labels
    const linkLabel = container.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter().append('text')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d.label || d.type);

    // Draw nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    // Add circles for nodes
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add labels
    node.append('text')
      .text(d => d.component || d.id)
      .attr('x', 0)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Add path labels below nodes
    node.append('text')
      .text(d => d.path)
      .attr('x', 0)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .style('pointer-events', 'none');

    // Node interactions
    node.on('click', (event, d) => {
      event.stopPropagation();

      // Toggle selection
      if (selectedNodes.includes(d.id)) {
        setSelectedNodes(selectedNodes.filter(id => id !== d.id));
      } else if (selectedNodes.length < 2) {
        setSelectedNodes([...selectedNodes, d.id]);
      } else {
        // Replace first selection
        setSelectedNodes([selectedNodes[1], d.id]);
      }

      // Center on clicked node with animation
      centerNode(d, svg, container, width, height);
    });

    node.on('mouseenter', (event, d) => {
      setHoveredNode(d.id);

      // Highlight connected edges and nodes
      link.attr('stroke-opacity', l =>
        (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.2)
        .attr('stroke-width', l =>
          (l.source.id === d.id || l.target.id === d.id) ? 3 : 2)
        .attr('marker-end', l =>
          (l.source.id === d.id || l.target.id === d.id) ? 'url(#arrow-hover)' : 'url(#arrow)');

      node.select('circle')
        .attr('opacity', n => {
          // Keep full opacity for hovered node and connected nodes
          if (n.id === d.id) return 1;
          const isConnected = links.some(l =>
            (l.source.id === d.id && l.target.id === n.id) ||
            (l.target.id === d.id && l.source.id === n.id)
          );
          return isConnected ? 1 : 0.3;
        });
    });

    node.on('mouseleave', () => {
      setHoveredNode(null);

      // Reset highlights
      link.attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrow)');

      node.select('circle')
        .attr('opacity', 1);
    });

    // Clear selection on background click
    svg.on('click', () => {
      setSelectedNodes([]);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Update selection highlights
    node.select('circle')
      .attr('stroke', d => selectedNodes.includes(d.id) ? '#4ecdc4' : '#fff')
      .attr('stroke-width', d => selectedNodes.includes(d.id) ? 4 : 2);

    // Drag functions
    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [graph, dimensions, selectedNodes, setSelectedNodes, setHoveredNode]);

  // Helper function to center on a node
  const centerNode = (node, svg, container, width, height) => {
    const scale = 1.5;
    const x = width / 2 - node.x * scale;
    const y = height / 2 - node.y * scale;

    svg.transition()
      .duration(750)
      .call(
        d3.zoom().transform,
        d3.zoomIdentity.translate(x, y).scale(scale)
      );
  };

  // Get node color based on type
  const getNodeColor = (type) => {
    const colors = {
      page: '#4ecdc4',
      auth: '#ff6b6b',
      dashboard: '#95e77e',
      error: '#ffd93d',
      component: '#a8dadc',
      default: '#457b9d'
    };
    return colors[type] || colors.default;
  };

  if (!graph) {
    return (
      <div className="graph-empty">
        <p>No graph data to display</p>
        <p>Select a project to visualize its structure</p>
      </div>
    );
  }

  return (
    <div className="d3-graph-container" ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: '100%', height: '100%' }}
      />

      <div className="graph-controls">
        <button
          onClick={() => simulationRef.current?.alpha(1).restart()}
          className="btn-secondary"
        >
          Restart Simulation
        </button>
        <button
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition()
              .duration(750)
              .call(
                d3.zoom().transform,
                d3.zoomIdentity
              );
          }}
          className="btn-secondary"
        >
          Reset Zoom
        </button>
      </div>

      <div className="graph-legend">
        <h4>Node Types</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#4ecdc4' }}></span>
            <span>Page</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ff6b6b' }}></span>
            <span>Auth</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#95e77e' }}></span>
            <span>Dashboard</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ffd93d' }}></span>
            <span>Error</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#a8dadc' }}></span>
            <span>Component</span>
          </div>
        </div>
      </div>

      <div className="graph-info">
        <p>Nodes: {Object.keys(graph.nodes).length}</p>
        <p>Edges: {graph.edges.length}</p>
        {hoveredNode && <p>Hovering: {hoveredNode}</p>}
        {selectedNodes.length > 0 && (
          <p>Selected: {selectedNodes.join(' → ')}</p>
        )}
      </div>
    </div>
  );
}

export default D3ForceGraph;