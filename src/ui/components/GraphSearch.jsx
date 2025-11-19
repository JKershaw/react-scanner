import React, { useState, useEffect } from 'react';
import { useStore } from '../App.jsx';

function GraphSearch({ onNodeFocus }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [suggestions, setSuggestions] = useState([]);
  const { graph, setSelectedNodes } = useStore();

  // Generate suggestions based on search term
  useEffect(() => {
    if (!graph || !searchTerm) {
      setSuggestions([]);
      return;
    }

    const matches = Object.values(graph.nodes).filter(node => {
      const matchesSearch =
        node.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.path.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || node.type === filterType;

      return matchesSearch && matchesType;
    }).slice(0, 5);

    setSuggestions(matches);
  }, [searchTerm, filterType, graph]);

  const handleSelectNode = (nodeId) => {
    setSelectedNodes([nodeId]);
    onNodeFocus(nodeId);
    setSearchTerm('');
    setSuggestions([]);
  };

  const getNodeTypes = () => {
    if (!graph) return [];
    const types = new Set(Object.values(graph.nodes).map(n => n.type));
    return Array.from(types);
  };

  return (
    <div className="graph-search">
      <div className="search-controls">
        <input
          type="text"
          placeholder="Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          {getNodeTypes().map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map(node => (
            <button
              key={node.id}
              onClick={() => handleSelectNode(node.id)}
              className="suggestion-item"
            >
              <span className="suggestion-name">{node.component}</span>
              <span className="suggestion-path">{node.path}</span>
              <span className={`suggestion-type type-${node.type}`}>{node.type}</span>
            </button>
          ))}
        </div>
      )}

      <div className="search-stats">
        {graph && (
          <span>{Object.values(graph.nodes).filter(n =>
            filterType === 'all' || n.type === filterType
          ).length} nodes visible</span>
        )}
      </div>
    </div>
  );
}

export default GraphSearch;