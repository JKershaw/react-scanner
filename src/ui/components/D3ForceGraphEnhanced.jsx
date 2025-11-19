import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useStore } from '../App.jsx';
import GraphSearch from './GraphSearch.jsx';

function D3ForceGraphEnhanced() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const graphContainerRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showLabels, setShowLabels] = useState(true);
  const [forceStrength, setForceStrength] = useState(-300);
  const [linkDistance, setLinkDistance] = useState(100);
  const [highlightConnected, setHighlightConnected] = useState(true);
  const [layoutType, setLayoutType] = useState('force'); // force, circular, hierarchical

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

  // Focus on a specific node
  const focusNode = (nodeId) => {
    if (!graphContainerRef.current || !zoomBehaviorRef.current) return;

    const node = d3.select(`#node-${nodeId}`);
    if (node.empty()) return;

    const nodeData = node.datum();
    const scale = 2;
    const x = dimensions.width / 2 - nodeData.x * scale;
    const y = dimensions.height / 2 - nodeData.y * scale;

    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(x, y).scale(scale)
      );
  };

  // Calculate layout positions
  const calculateLayout = (nodes, edges, type) => {
    const { width, height } = dimensions;

    switch (type) {
      case 'circular':
        const radius = Math.min(width, height) * 0.35;
        const angleStep = (2 * Math.PI) / nodes.length;
        nodes.forEach((node, i) => {
          node.fx = width / 2 + radius * Math.cos(i * angleStep);
          node.fy = height / 2 + radius * Math.sin(i * angleStep);
        });
        break;

      case 'hierarchical':
        // Group nodes by type
        const groups = {};
        nodes.forEach(node => {
          if (!groups[node.type]) groups[node.type] = [];
          groups[node.type].push(node);
        });

        let yOffset = 100;
        Object.entries(groups).forEach(([type, groupNodes]) => {
          const xStep = width / (groupNodes.length + 1);
          groupNodes.forEach((node, i) => {
            node.fx = xStep * (i + 1);
            node.fy = yOffset;
          });
          yOffset += 150;
        });
        break;

      case 'force':
      default:
        // Release fixed positions for force layout
        nodes.forEach(node => {
          node.fx = null;
          node.fy = null;
        });
        break;
    }
  };

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

    // Apply initial layout
    calculateLayout(nodes, links, layoutType);

    // Create container for zoom
    const container = svg.append('g')
      .attr('class', 'graph-container');
    graphContainerRef.current = container;

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(linkDistance))
      .force('charge', d3.forceManyBody()
        .strength(forceStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(30));

    simulationRef.current = simulation;

    // Add arrow markers
    const defs = svg.append('defs');

    ['arrow', 'arrow-hover', 'arrow-selected'].forEach(id => {
      defs.append('marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', id === 'arrow-hover' ? '#ff6b6b' :
                       id === 'arrow-selected' ? '#4ecdc4' : '#999');
    });

    // Draw links
    const link = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => d.type === 'import' ? 1 : 2)
      .attr('stroke-dasharray', d => d.type === 'import' ? '5,5' : 'none')
      .attr('marker-end', 'url(#arrow)');

    // Draw link labels (only if enabled)
    const linkLabel = container.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter().append('text')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .style('opacity', showLabels ? 0.7 : 0)
      .text(d => d.label || d.type);

    // Draw nodes
    const node = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .attr('id', d => `node-${d.id}`)
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    // Add circles for nodes with size based on connections
    node.append('circle')
      .attr('r', d => {
        const connections = links.filter(l =>
          l.source.id === d.id || l.target.id === d.id
        ).length;
        return Math.min(15 + connections * 2, 30);
      })
      .attr('fill', d => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add labels (component names)
    node.append('text')
      .text(d => d.component || d.id)
      .attr('x', 0)
      .attr('y', -25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .style('opacity', showLabels ? 1 : 0);

    // Add path labels (smaller, below nodes)
    node.append('text')
      .text(d => d.path)
      .attr('x', 0)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#666')
      .style('pointer-events', 'none')
      .style('opacity', showLabels ? 0.7 : 0);

    // Node interactions
    node.on('click', (event, d) => {
      event.stopPropagation();

      // Toggle selection
      if (selectedNodes.includes(d.id)) {
        setSelectedNodes(selectedNodes.filter(id => id !== d.id));
      } else if (selectedNodes.length < 2) {
        setSelectedNodes([...selectedNodes, d.id]);
      } else {
        setSelectedNodes([selectedNodes[1], d.id]);
      }

      // Center on clicked node
      focusNode(d.id);
    });

    node.on('mouseenter', (event, d) => {
      setHoveredNode(d.id);

      if (highlightConnected) {
        // Highlight connected edges
        link.attr('stroke-opacity', l =>
          (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1)
          .attr('stroke-width', l =>
            (l.source.id === d.id || l.target.id === d.id) ? 3 : 1);

        // Highlight connected nodes
        node.select('circle')
          .attr('opacity', n => {
            if (n.id === d.id) return 1;
            const isConnected = links.some(l =>
              (l.source.id === d.id && l.target.id === n.id) ||
              (l.target.id === d.id && l.source.id === n.id)
            );
            return isConnected ? 1 : 0.3;
          });
      }

      // Show tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', 'graph-tooltip')
        .style('position', 'absolute')
        .style('padding', '8px')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('opacity', 0);

      tooltip.transition()
        .duration(200)
        .style('opacity', 1);

      tooltip.html(`
        <strong>${d.component}</strong><br/>
        Path: ${d.path}<br/>
        Type: ${d.type}<br/>
        Connections: ${links.filter(l =>
          l.source.id === d.id || l.target.id === d.id
        ).length}
      `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    });

    node.on('mouseleave', () => {
      setHoveredNode(null);

      // Reset highlights
      link.attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => d.type === 'import' ? 1 : 2);

      node.select('circle')
        .attr('opacity', 1);

      // Remove tooltip
      d3.selectAll('.graph-tooltip').remove();
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
      // Keep position fixed if not in force layout
      if (layoutType === 'force') {
        d.fx = null;
        d.fy = null;
      }
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      d3.selectAll('.graph-tooltip').remove();
    };
  }, [graph, dimensions, selectedNodes, showLabels, forceStrength, linkDistance,
      highlightConnected, layoutType, setSelectedNodes, setHoveredNode]);

  // Helper function for node colors
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

      {/* Search and Filter */}
      <div className="graph-search-panel">
        <GraphSearch onNodeFocus={focusNode} />
      </div>

      {/* Enhanced Controls */}
      <div className="graph-controls">
        <div className="control-group">
          <label>Layout:</label>
          <select
            value={layoutType}
            onChange={(e) => setLayoutType(e.target.value)}
            className="control-select"
          >
            <option value="force">Force</option>
            <option value="circular">Circular</option>
            <option value="hierarchical">Hierarchical</option>
          </select>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            Labels
          </label>
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={highlightConnected}
              onChange={(e) => setHighlightConnected(e.target.checked)}
            />
            Highlight
          </label>
        </div>

        <button
          onClick={() => simulationRef.current?.alpha(1).restart()}
          className="btn-control"
        >
          Restart
        </button>

        <button
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition()
              .duration(750)
              .call(
                zoomBehaviorRef.current.transform,
                d3.zoomIdentity
              );
          }}
          className="btn-control"
        >
          Reset View
        </button>
      </div>

      {/* Force Controls */}
      {layoutType === 'force' && (
        <div className="force-controls">
          <div className="control-slider">
            <label>Force Strength: {forceStrength}</label>
            <input
              type="range"
              min="-1000"
              max="-50"
              value={forceStrength}
              onChange={(e) => {
                setForceStrength(Number(e.target.value));
                if (simulationRef.current) {
                  simulationRef.current.force('charge')
                    .strength(Number(e.target.value));
                  simulationRef.current.alpha(1).restart();
                }
              }}
            />
          </div>

          <div className="control-slider">
            <label>Link Distance: {linkDistance}</label>
            <input
              type="range"
              min="30"
              max="300"
              value={linkDistance}
              onChange={(e) => {
                setLinkDistance(Number(e.target.value));
                if (simulationRef.current) {
                  simulationRef.current.force('link')
                    .distance(Number(e.target.value));
                  simulationRef.current.alpha(1).restart();
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Improved Legend */}
      <div className="graph-legend">
        <h4>Node Types</h4>
        <div className="legend-items">
          {Object.entries({
            page: '#4ecdc4',
            auth: '#ff6b6b',
            dashboard: '#95e77e',
            error: '#ffd93d',
            component: '#a8dadc'
          }).map(([type, color]) => (
            <div key={type} className="legend-item">
              <span className="legend-color" style={{ backgroundColor: color }}></span>
              <span>{type}</span>
              <span className="legend-count">
                ({Object.values(graph.nodes).filter(n => n.type === type).length})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Info Panel */}
      <div className="graph-info">
        <p><strong>Graph Statistics</strong></p>
        <p>Nodes: {Object.keys(graph.nodes).length}</p>
        <p>Edges: {graph.edges.length}</p>
        <p>Density: {(2 * graph.edges.length / (Object.keys(graph.nodes).length * (Object.keys(graph.nodes).length - 1)) * 100).toFixed(1)}%</p>
        {hoveredNode && <p>Hovering: {hoveredNode}</p>}
        {selectedNodes.length > 0 && (
          <p>Selected: {selectedNodes.join(' → ')}</p>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="keyboard-help">
        <span>?</span>
        <div className="help-content">
          <h4>Keyboard Shortcuts</h4>
          <div>/ - Search</div>
          <div>L - Toggle Labels</div>
          <div>H - Toggle Highlight</div>
          <div>R - Reset View</div>
          <div>ESC - Clear Selection</div>
        </div>
      </div>
    </div>
  );
}

export default D3ForceGraphEnhanced;