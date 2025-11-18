import { useCallback } from 'react';
import { useStore } from '../App.jsx';

/**
 * Custom hook for project management
 * @returns {Object} Project state and actions
 */
export function useProject() {
  const {
    currentProject,
    projects,
    isLoading,
    error,
    setProjects,
    setCurrentProject,
    setLoading,
    setError,
    setGraph,
  } = useStore();

  const scanProject = useCallback(async (projectPath) => {
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

      // Save to recent projects
      const recent = projects.filter(p => p.path !== project.path);
      const updated = [project, ...recent].slice(0, 10);
      setProjects(updated);
      localStorage.setItem('recentProjects', JSON.stringify(updated));

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projects, setProjects, setCurrentProject, setLoading, setError, setGraph]);

  const clearProject = useCallback(() => {
    setCurrentProject(null);
    setGraph(null);
  }, [setCurrentProject, setGraph]);

  const loadRecentProjects = useCallback(() => {
    const saved = localStorage.getItem('recentProjects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent projects', e);
      }
    }
  }, [setProjects]);

  return {
    currentProject,
    projects,
    isLoading,
    error,
    scanProject,
    clearProject,
    loadRecentProjects,
    clearError: () => setError(null),
  };
}
