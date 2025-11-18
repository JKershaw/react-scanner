import React, { useState, useEffect } from 'react';
import { useStore } from '../App.jsx';

function ProjectSelector() {
  const {
    projects,
    currentProject,
    isLoading,
    setProjects,
    setCurrentProject,
    setLoading,
    setError,
    setGraph,
  } = useStore();

  const [customPath, setCustomPath] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Load recent projects from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentProjects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent projects', e);
      }
    }
  }, [setProjects]);

  // Save projects to localStorage
  const saveToRecent = (project) => {
    const recent = projects.filter(p => p.path !== project.path);
    const updated = [project, ...recent].slice(0, 10);
    setProjects(updated);
    localStorage.setItem('recentProjects', JSON.stringify(updated));
  };

  const handleScanProject = async (projectPath) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scan project');
      }

      const data = await response.json();

      const project = {
        path: projectPath,
        name: data.projectPath.split('/').pop(),
      };

      setCurrentProject(project);
      setGraph(data.graph);
      saveToRecent(project);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customPath.trim()) {
      handleScanProject(customPath.trim());
      setShowCustomInput(false);
      setCustomPath('');
    }
  };

  return (
    <div className="project-selector">
      <div className="selector-controls">
        {currentProject ? (
          <div className="current-project">
            <span className="project-name">{currentProject.name}</span>
            <button
              className="btn-secondary"
              onClick={() => {
                setCurrentProject(null);
                setGraph(null);
              }}
            >
              Change
            </button>
          </div>
        ) : (
          <>
            {projects.length > 0 && (
              <select
                className="project-dropdown"
                value=""
                onChange={(e) => handleScanProject(e.target.value)}
                disabled={isLoading}
              >
                <option value="" disabled>
                  {isLoading ? 'Scanning...' : 'Select Recent Project'}
                </option>
                {projects.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <button
              className="btn-primary"
              onClick={() => setShowCustomInput(!showCustomInput)}
              disabled={isLoading}
            >
              {showCustomInput ? 'Cancel' : 'Add Project'}
            </button>
          </>
        )}
      </div>

      {showCustomInput && (
        <form className="custom-path-form" onSubmit={handleCustomSubmit}>
          <input
            type="text"
            placeholder="Enter project path..."
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={isLoading || !customPath.trim()}>
            Scan
          </button>
        </form>
      )}

      {isLoading && (
        <div className="scan-progress">
          <div className="spinner"></div>
          <span>Scanning project...</span>
        </div>
      )}
    </div>
  );
}

export default ProjectSelector;
