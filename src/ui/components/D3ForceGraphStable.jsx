import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { useStore } from '../App.jsx';
import GraphSearch from './GraphSearch.jsx';

// Store node positions globally to persist between renders
const nodePositions = new Map();

function D3ForceGraphStable() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const nodesDataRef = useRef([]);
  const linksDataRef = useRef([]);
  const isInitializedRef = useRef(false);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showLabels, setShowLabels] = useState(true);
  const [forceStrength, setForceStrength] = useState(-800);
  const [linkDistance, setLinkDistance] = useState(170);
  const [highlightConnected, setHighlightConnected] = useState(true);
  const [layoutType, setLayoutType] = useState('force');

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

  // Get node color based on type
  const getNodeColor = useCallback((type) => {
    const colors = {
      page: '#4ecdc4',
      auth: '#ff6b6b',
      dashboard: '#95e77e',
      error: '#ffd93d',
      component: '#a8dadc',
      default: '#457b9d'
    };
    return colors[type] || colors.default;
  }, []);

  // Focus on a specific node with smooth transition
  const focusNode = useCallback((nodeId) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;

    const node = nodesDataRef.current.find(n => n.id === nodeId);
    if (!node) return;

    // Get current transform
    const currentTransform = d3.zoomTransform(svgRef.current);

    // Get the actual visible area dimensions
    const svg = svgRef.current;
    const bounds = svg.getBoundingClientRect();
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;

    // Keep current scale or slightly zoom in if too far out
    const targetScale = Math.max(currentTransform.k, 1.5);

    // Calculate translation to center the node in the viewport
    const x = centerX - node.x * targetScale;
    const y = centerY - node.y * targetScale;

    d3.select(svgRef.current)
      .transition()
      .duration(1000)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(x, y).scale(targetScale)
      );
  }, []);

  // Apply layout without restarting simulation
  const applyLayout = useCallback((type) => {
    const nodes = nodesDataRef.current;

    if (!nodes || nodes.length === 0 || !svgRef.current) return;

    // Get actual SVG dimensions from the element
    const svg = svgRef.current;
    const bounds = svg.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;

    switch (type) {
      case 'circular':
        const radius = Math.min(width, height) * 0.35;
        const angleStep = (2 * Math.PI) / nodes.length;

        // Smoothly transition to circular layout
        nodes.forEach((node, i) => {
          const targetX = width / 2 + radius * Math.cos(i * angleStep);
          const targetY = height / 2 + radius * Math.sin(i * angleStep);

          // Animate the transition
          d3.select(`#node-${node.id}`)
            .transition()
            .duration(1000)
            .tween('position', function() {
              const ix = d3.interpolate(node.x, targetX);
              const iy = d3.interpolate(node.y, targetY);
              return function(t) {
                node.x = node.fx = ix(t);
                node.y = node.fy = iy(t);
              };
            });
        });
        break;

      case 'hierarchical':
        const groups = {};
        nodes.forEach(node => {
          if (!groups[node.type]) groups[node.type] = [];
          groups[node.type].push(node);
        });

        let yOffset = 100;
        Object.entries(groups).forEach(([type, groupNodes]) => {
          const xStep = width / (groupNodes.length + 1);
          groupNodes.forEach((node, i) => {
            const targetX = xStep * (i + 1);
            const targetY = yOffset;

            d3.select(`#node-${node.id}`)
              .transition()
              .duration(1000)
              .tween('position', function() {
                const ix = d3.interpolate(node.x, targetX);
                const iy = d3.interpolate(node.y, targetY);
                return function(t) {
                  node.x = node.fx = ix(t);
                  node.y = node.fy = iy(t);
                };
              });
          });
          yOffset += 150;
        });
        break;

      case 'force':
      default:
        // Gently release fixed positions
        nodes.forEach(node => {
          node.fx = null;
          node.fy = null;
        });
        // Gently restart with low alpha
        if (simulationRef.current) {
          simulationRef.current.alpha(0.3).restart();
        }
        break;
    }

    // Update links during transition
    if (simulationRef.current) {
      simulationRef.current.on('tick.layout', updatePositions);
    }
  }, [dimensions]);

  // Update visual positions without restarting simulation
  const updatePositions = useCallback(() => {
    const svg = d3.select(svgRef.current);

    svg.selectAll('.links line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    svg.selectAll('.link-labels text')
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    svg.selectAll('.node-group')
      .attr('transform', d => `translate(${d.x},${d.y})`);
  }, []);

  // Initialize or update the graph
  useEffect(() => {
    if (!graph || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    // Get actual SVG viewport dimensions
    const svgBounds = svgRef.current.getBoundingClientRect();
    const viewportCenterX = svgBounds.width / 2;
    const viewportCenterY = svgBounds.height / 2;

    // Prepare nodes with preserved positions or centered initial positions
    const nodes = Object.values(graph.nodes).map(node => {
      const existingPos = nodePositions.get(node.id);
      return {
        ...node,
        x: existingPos?.x || viewportCenterX + (Math.random() - 0.5) * 200,
        y: existingPos?.y || viewportCenterY + (Math.random() - 0.5) * 200,
        vx: existingPos?.vx || 0,
        vy: existingPos?.vy || 0
      };
    });

    const links = graph.edges.map(edge => ({
      ...edge,
      source: edge.from,
      target: edge.to
    }));

    nodesDataRef.current = nodes;
    linksDataRef.current = links;

    // Only create the visualization once
    if (!isInitializedRef.current) {
      // Clear and setup
      svg.selectAll('*').remove();

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
      zoomBehaviorRef.current = zoom;

      // Create force simulation with gentle forces
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
          .id(d => d.id)
          .distance(linkDistance))
        .force('charge', d3.forceManyBody()
          .strength(forceStrength))
        .force('center', d3.forceCenter(viewportCenterX, viewportCenterY)
          .strength(0.05)) // Weak centering force
        .force('collision', d3.forceCollide()
          .radius(30))
        .alphaDecay(0.01) // Slower decay for smoother motion
        .velocityDecay(0.4); // More damping

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
      container.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => d.type === 'import' ? 1 : 2)
        .attr('stroke-dasharray', d => d.type === 'import' ? '5,5' : 'none')
        .attr('marker-end', 'url(#arrow)');

      // Draw link labels
      container.append('g')
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
      const nodeGroups = container.append('g')
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

      // Add circles for nodes
      nodeGroups.append('circle')
        .attr('r', d => {
          const connections = links.filter(l =>
            l.source === d.id || l.target === d.id ||
            l.source.id === d.id || l.target.id === d.id
          ).length;
          return Math.min(15 + connections * 2, 30);
        })
        .attr('fill', d => getNodeColor(d.type))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');

      // Add labels
      nodeGroups.append('text')
        .text(d => d.component || d.id)
        .attr('x', 0)
        .attr('y', -25)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')
        .style('opacity', showLabels ? 1 : 0);

      // Add path labels
      nodeGroups.append('text')
        .text(d => d.path)
        .attr('x', 0)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', '#666')
        .style('pointer-events', 'none')
        .style('opacity', showLabels ? 0.7 : 0);

      // Setup interactions
      nodeGroups.on('click', handleNodeClick);
      nodeGroups.on('mouseenter', handleNodeHover);
      nodeGroups.on('mouseleave', handleNodeLeave);

      svg.on('click', () => setSelectedNodes([]));

      // Update positions on simulation tick
      simulation.on('tick', () => {
        updatePositions();
        // Save positions for persistence
        nodes.forEach(node => {
          nodePositions.set(node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
        });
      });

      isInitializedRef.current = true;
    }

    // Drag functions
    function dragStarted(event, d) {
      if (!event.active) simulationRef.current.alphaTarget(0.1).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulationRef.current.alphaTarget(0);
      if (layoutType === 'force') {
        d.fx = null;
        d.fy = null;
      }
    }

    function handleNodeClick(event, d) {
      event.stopPropagation();

      if (selectedNodes.includes(d.id)) {
        setSelectedNodes(selectedNodes.filter(id => id !== d.id));
      } else if (selectedNodes.length < 2) {
        setSelectedNodes([...selectedNodes, d.id]);
      } else {
        setSelectedNodes([selectedNodes[1], d.id]);
      }

      // Smooth focus on clicked node
      focusNode(d.id);
    }

    function handleNodeHover(event, d) {
      setHoveredNode(d.id);

      if (highlightConnected) {
        const svg = d3.select(svgRef.current);

        // Smooth opacity transitions
        svg.selectAll('.links line')
          .transition()
          .duration(200)
          .attr('stroke-opacity', l =>
            (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);

        svg.selectAll('.node-group circle')
          .transition()
          .duration(200)
          .attr('opacity', n => {
            if (n.id === d.id) return 1;
            const isConnected = linksDataRef.current.some(l =>
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
        Connections: ${linksDataRef.current.filter(l =>
          l.source.id === d.id || l.target.id === d.id
        ).length}
      `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    }

    function handleNodeLeave() {
      setHoveredNode(null);

      const svg = d3.select(svgRef.current);

      // Smooth opacity reset
      svg.selectAll('.links line')
        .transition()
        .duration(200)
        .attr('stroke-opacity', 0.6);

      svg.selectAll('.node-group circle')
        .transition()
        .duration(200)
        .attr('opacity', 1);

      d3.selectAll('.graph-tooltip').remove();
    }

    return () => {
      d3.selectAll('.graph-tooltip').remove();
    };
  }, [graph, dimensions, selectedNodes, layoutType, highlightConnected,
      showLabels, focusNode, setSelectedNodes, setHoveredNode, getNodeColor, updatePositions]);

  // Update label visibility smoothly
  useEffect(() => {
    const svg = d3.select(svgRef.current);

    svg.selectAll('.node-group text')
      .transition()
      .duration(300)
      .style('opacity', function() {
        const isPathLabel = d3.select(this).attr('y') === '35';
        return showLabels ? (isPathLabel ? 0.7 : 1) : 0;
      });

    svg.selectAll('.link-labels text')
      .transition()
      .duration(300)
      .style('opacity', showLabels ? 0.7 : 0);
  }, [showLabels]);

  // Update force strength without restarting
  const updateForceStrength = useCallback((value) => {
    setForceStrength(value);
    if (simulationRef.current) {
      simulationRef.current
        .force('charge')
        .strength(value);
      simulationRef.current.alpha(0.3).restart();
    }
  }, []);

  // Update link distance without restarting
  const updateLinkDistance = useCallback((value) => {
    setLinkDistance(value);
    if (simulationRef.current) {
      simulationRef.current
        .force('link')
        .distance(value);
      simulationRef.current.alpha(0.3).restart();
    }
  }, []);

  // Handle layout changes
  const handleLayoutChange = useCallback((type) => {
    setLayoutType(type);
    applyLayout(type);
  }, [applyLayout]);

  // Update selection highlights smoothly
  useEffect(() => {
    const svg = d3.select(svgRef.current);

    svg.selectAll('.node-group circle')
      .transition()
      .duration(300)
      .attr('stroke', d => selectedNodes.includes(d.id) ? '#4ecdc4' : '#fff')
      .attr('stroke-width', d => selectedNodes.includes(d.id) ? 4 : 2);
  }, [selectedNodes]);

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
            onChange={(e) => handleLayoutChange(e.target.value)}
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
          onClick={() => {
            if (simulationRef.current) {
              simulationRef.current.alpha(0.3).restart();
            }
          }}
          className="btn-control"
        >
          Gentle Restart
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
              onChange={(e) => updateForceStrength(Number(e.target.value))}
            />
          </div>

          <div className="control-slider">
            <label>Link Distance: {linkDistance}</label>
            <input
              type="range"
              min="30"
              max="300"
              value={linkDistance}
              onChange={(e) => updateLinkDistance(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Legend and Info remain the same */}
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

      <div className="graph-info">
        <p><strong>Graph Statistics</strong></p>
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

export default D3ForceGraphStable;