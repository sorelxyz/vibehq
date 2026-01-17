import { useState, useEffect } from 'react';
import type { Project } from '@vibehq/shared';

interface ProjectModalProps {
  project?: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; path: string }) => void;
  isLoading?: boolean;
}

export default function ProjectModal({ project, isOpen, onClose, onSave, isLoading }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  const [isBrowsing, setIsBrowsing] = useState(false);

  const handleBrowse = async () => {
    setIsBrowsing(true);
    try {
      const res = await fetch('/api/projects/pick-folder', { method: 'POST' });
      const data = await res.json();
      if (data.path) {
        setPath(data.path);
        // Auto-fill name from folder name if empty
        if (!name.trim()) {
          const folderName = data.path.split('/').pop() || '';
          setName(folderName);
        }
      }
    } catch (err) {
      setError('Failed to open folder picker');
    } finally {
      setIsBrowsing(false);
    }
  };

  useEffect(() => {
    if (project) {
      setName(project.name);
      setPath(project.path);
    } else {
      setName('');
      setPath('');
    }
    setError('');
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) {
      setError('Name and path are required');
      return;
    }
    onSave({ name: name.trim(), path: path.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4 border border-neutral-800">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {project ? 'Edit Project' : 'New Project'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Project"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="path" className="block text-sm font-medium text-neutral-300 mb-1">
                Path
              </label>
              <div className="flex gap-2">
                <input
                  id="path"
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/path/to/your/project"
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  disabled={isBrowsing}
                  className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  {isBrowsing ? '...' : 'Browse'}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
