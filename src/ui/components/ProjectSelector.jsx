import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../App.jsx';

// Default projects that always appear
const DEFAULT_PROJECTS = [
  { name: 'Demo App', path: '/home/user/react-scanner/demo' },
  { name: 'This Project', path: '/home/user/react-scanner' },
];

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
  const folderInputRef = useRef(null);

  // Load recent projects from localStorage and merge with defaults
  useEffect(() => {
    const saved = localStorage.getItem('recentProjects');
    let recent = [];
    if (saved) {
      try {
        recent = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load recent projects', e);
      }
    }

    // Merge defaults with recent, avoiding duplicates
    const defaultPaths = DEFAULT_PROJECTS.map(p => p.path);
    const filteredRecent = recent.filter(p => !defaultPaths.includes(p.path));
    setProjects([...DEFAULT_PROJECTS, ...filteredRecent]);
  }, [setProjects]);

  // Save projects to localStorage (excluding defaults)
  const saveToRecent = (project) => {
    const defaultPaths = DEFAULT_PROJECTS.map(p => p.path);
    const isDefault = defaultPaths.includes(project.path);

    if (!isDefault) {
      const recent = projects
        .filter(p => !defaultPaths.includes(p.path) && p.path !== project.path);
      const updated = [project, ...recent].slice(0, 10);
      localStorage.setItem('recentProjects', JSON.stringify(updated));
    }

    // Update state with project at top (after defaults)
    const others = projects.filter(p => p.path !== project.path);
    if (isDefault) {
      setProjects(others);
    } else {
      const defaults = others.filter(p => defaultPaths.includes(p.path));
      const nonDefaults = others.filter(p => !defaultPaths.includes(p.path));
      setProjects([...defaults, project, ...nonDefaults]);
    }
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

  const handleFolderSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get the folder path from the first file's webkitRelativePath
      const relativePath = files[0].webkitRelativePath;
      const folderName = relativePath.split('/')[0];

      // For browser security, we can't get the absolute path
      // So we'll prompt the user to enter it
      setCustomPath(folderName);
      setShowCustomInput(true);
      setError('Browser security prevents reading absolute paths. Please enter the full path to: ' + folderName);
    }
    // Reset input
    e.target.value = '';
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
            <select
              className="project-dropdown"
              value=""
              onChange={(e) => handleScanProject(e.target.value)}
              disabled={isLoading}
            >
              <option value="" disabled>
                {isLoading ? 'Scanning...' : 'Select Project'}
              </option>
              <optgroup label="Default Projects">
                {DEFAULT_PROJECTS.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
              {projects.filter(p => !DEFAULT_PROJECTS.some(d => d.path === p.path)).length > 0 && (
                <optgroup label="Recent Projects">
                  {projects
                    .filter(p => !DEFAULT_PROJECTS.some(d => d.path === p.path))
                    .map((p) => (
                      <option key={p.path} value={p.path}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFolderSelect}
              webkitdirectory=""
              directory=""
              style={{ display: 'none' }}
            />

            <button
              className="btn-secondary"
              onClick={() => folderInputRef.current?.click()}
              disabled={isLoading}
              title="Browse for folder"
            >
              Browse
            </button>

            <button
              className="btn-primary"
              onClick={() => setShowCustomInput(!showCustomInput)}
              disabled={isLoading}
            >
              {showCustomInput ? 'Cancel' : 'Custom Path'}
            </button>
          </>
        )}
      </div>

      {showCustomInput && (
        <form className="custom-path-form" onSubmit={handleCustomSubmit}>
          <input
            type="text"
            placeholder="Enter project path (e.g., /home/user/my-app)"
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
