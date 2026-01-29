import { useState } from 'react';
import type { Project } from '@vibehq/shared';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import ProjectModal from './ProjectModal';
import ConfirmDialog from './ConfirmDialog';

interface ManageProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageProjectsModal({ isOpen, onClose }: ManageProjectsModalProps) {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  if (!isOpen) return null;

  const handleCreate = () => {
    setEditingProject(undefined);
    setIsProjectModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSave = async (data: { name: string; path: string; color: string }) => {
    if (editingProject) {
      await updateProject.mutateAsync({ id: editingProject.id, data });
    } else {
      await createProject.mutateAsync(data);
    }
    setIsProjectModalOpen(false);
  };

  const handleDelete = async () => {
    if (deletingProject) {
      await deleteProject.mutateAsync(deletingProject.id);
      setDeletingProject(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-gray-200 dark:border-neutral-800 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Manage Projects</h2>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-neutral-800 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-neutral-800 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || '#6366f1' }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-neutral-100 truncate">{project.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-neutral-500 truncate" title={project.path}>
                        {project.path}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(project)}
                        className="p-1.5 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingProject(project)}
                        className="p-1.5 text-gray-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-neutral-800 mb-3">
                  <svg className="w-6 h-6 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-neutral-400 text-sm mb-3">No projects yet</p>
                <button
                  onClick={handleCreate}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Create Project
                </button>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-neutral-800">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <ProjectModal
        project={editingProject}
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSave}
        isLoading={createProject.isPending || updateProject.isPending}
      />

      <ConfirmDialog
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This will also delete all tickets associated with this project.`}
        confirmLabel="Delete"
        isOpen={!!deletingProject}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeletingProject(null)}
      />
    </>
  );
}
