import React, { useState } from 'react';
import { useStore } from '../App.jsx';

function PlanningMode() {
  const {
    isPlanningMode,
    plannedNodes,
    plannedEdges,
    togglePlanningMode,
    addPlannedNode,
    addPlannedEdge,
    graph,
  } = useStore();

  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showEdgeForm, setShowEdgeForm] = useState(false);
  const [newNode, setNewNode] = useState({ label: '', path: '', type: 'page' });
  const [newEdge, setNewEdge] = useState({ from: '', to: '', action: 'navigates to' });

  const handleAddNode = (e) => {
    e.preventDefault();
    if (newNode.label && newNode.path) {
      addPlannedNode({
        id: `planned_${Date.now()}`,
        ...newNode,
        planned: true,
      });
      setNewNode({ label: '', path: '', type: 'page' });
      setShowNodeForm(false);
    }
  };

  const handleAddEdge = (e) => {
    e.preventDefault();
    if (newEdge.from && newEdge.to) {
      addPlannedEdge({
        id: `planned_edge_${Date.now()}`,
        ...newEdge,
        planned: true,
      });
      setNewEdge({ from: '', to: '', action: 'navigates to' });
      setShowEdgeForm(false);
    }
  };

  const exportGherkin = () => {
    const features = plannedNodes.map((node) => {
      return `
  Scenario: User accesses ${node.label}
    Given I am a user
    When I navigate to "${node.path}"
    Then I should see the ${node.label} page`;
    });

    const content = `Feature: Planned Features
  As a product owner
  I want to define new navigation paths
  So that developers can implement them

${features.join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planned-features.feature';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get all nodes (existing + planned) for edge selection
  const allNodes = [
    ...(graph ? Object.entries(graph.nodes).map(([id, node]) => ({ id, label: node.label })) : []),
    ...plannedNodes.map((n) => ({ id: n.id, label: `[NEW] ${n.label}` })),
  ];

  return (
    <div className="planning-mode">
      <div className="planning-header">
        <h3>Planning Mode</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={isPlanningMode}
            onChange={togglePlanningMode}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {isPlanningMode && (
        <div className="planning-content">
          <p className="planning-hint">
            Draft new pages and connections before implementing them.
          </p>

          <div className="planning-actions">
            <button
              className="btn-secondary btn-small"
              onClick={() => setShowNodeForm(!showNodeForm)}
            >
              + Add Page
            </button>
            <button
              className="btn-secondary btn-small"
              onClick={() => setShowEdgeForm(!showEdgeForm)}
            >
              + Add Connection
            </button>
          </div>

          {showNodeForm && (
            <form className="planning-form" onSubmit={handleAddNode}>
              <input
                type="text"
                placeholder="Page name"
                value={newNode.label}
                onChange={(e) => setNewNode({ ...newNode, label: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Route path (e.g., /settings)"
                value={newNode.path}
                onChange={(e) => setNewNode({ ...newNode, path: e.target.value })}
                required
              />
              <select
                value={newNode.type}
                onChange={(e) => setNewNode({ ...newNode, type: e.target.value })}
              >
                <option value="page">Page</option>
                <option value="modal">Modal</option>
                <option value="form">Form</option>
              </select>
              <button type="submit" className="btn-primary btn-small">
                Add
              </button>
            </form>
          )}

          {showEdgeForm && (
            <form className="planning-form" onSubmit={handleAddEdge}>
              <select
                value={newEdge.from}
                onChange={(e) => setNewEdge({ ...newEdge, from: e.target.value })}
                required
              >
                <option value="">From page...</option>
                {allNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
              <select
                value={newEdge.to}
                onChange={(e) => setNewEdge({ ...newEdge, to: e.target.value })}
                required
              >
                <option value="">To page...</option>
                {allNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Action (e.g., clicks button)"
                value={newEdge.action}
                onChange={(e) => setNewEdge({ ...newEdge, action: e.target.value })}
              />
              <button type="submit" className="btn-primary btn-small">
                Add
              </button>
            </form>
          )}

          {plannedNodes.length > 0 && (
            <div className="planned-items">
              <h4>Planned Pages ({plannedNodes.length})</h4>
              <ul>
                {plannedNodes.map((node) => (
                  <li key={node.id}>
                    {node.label} <span className="path">{node.path}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plannedEdges.length > 0 && (
            <div className="planned-items">
              <h4>Planned Connections ({plannedEdges.length})</h4>
              <ul>
                {plannedEdges.map((edge) => (
                  <li key={edge.id}>
                    {edge.from} → {edge.to}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(plannedNodes.length > 0 || plannedEdges.length > 0) && (
            <button className="btn-primary" onClick={exportGherkin}>
              Export as Gherkin
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PlanningMode;
