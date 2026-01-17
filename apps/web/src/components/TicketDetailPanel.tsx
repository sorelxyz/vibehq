import { useState, useEffect } from 'react';
import type { Ticket, TicketStatus, Project } from '@vibehq/shared';
import { TICKET_STATUSES } from '@vibehq/shared';
import { useUpdateTicket, useDeleteTicket, useGeneratePRD, useApprovePRD, useRalphInstance, useCleanupWorktree, useCleanupAll } from '../hooks/useTickets';
import { useImages, useUploadImage, useDeleteImage } from '../hooks/useImages';
import { useRalphLogs } from '../hooks/useRalphLogs';
import ConfirmDialog from './ConfirmDialog';
import ImageUpload from './ImageUpload';
import PRDViewer from './PRDViewer';
import PRDEditor from './PRDEditor';
import RalphLogViewer from './RalphLogViewer';

interface TicketDetailPanelProps {
  ticket: Ticket | null;
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: 'Backlog',
  up_next: 'Up Next',
  in_review: 'In Review',
  in_progress: 'In Progress',
  in_testing: 'In Testing',
  completed: 'Completed',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function TicketDetailPanel({ ticket, project, isOpen, onClose }: TicketDetailPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingPRD, setIsEditingPRD] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();
  const generatePRD = useGeneratePRD();
  const approvePRD = useApprovePRD();

  const { data: images = [] } = useImages(ticket?.id || '');
  const uploadImage = useUploadImage();
  const deleteImage = useDeleteImage();

  // Fetch RALPH instance when ticket is in_progress or in_testing
  const { data: ralphInstance } = useRalphInstance(
    ticket?.status === 'in_progress' || ticket?.status === 'in_testing' ? ticket?.id : undefined
  );

  const cleanupWorktree = useCleanupWorktree();
  const cleanupAll = useCleanupAll();

  // WebSocket logs for running instances
  const { logs, status: ralphStatus, isConnected, error: logsError } = useRalphLogs(
    ralphInstance?.id ?? null
  );

  const handleUpload = (file: File) => {
    if (ticket) {
      uploadImage.mutate({ ticketId: ticket.id, file });
    }
  };

  const handleDeleteImage = (imageId: string) => {
    if (ticket) {
      deleteImage.mutate({ id: imageId, ticketId: ticket.id });
    }
  };

  useEffect(() => {
    if (ticket) {
      setEditTitle(ticket.title);
      setEditDescription(ticket.description);
    }
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setIsEditingPRD(false);
  }, [ticket]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!ticket) return null;

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return;
    await updateTicket.mutateAsync({ id: ticket.id, data: { title: editTitle.trim() } });
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    await updateTicket.mutateAsync({ id: ticket.id, data: { description: editDescription } });
    setIsEditingDescription(false);
  };

  const handleStatusChange = async (status: TicketStatus) => {
    await updateTicket.mutateAsync({ id: ticket.id, data: { status } });
  };

  const handleDelete = async () => {
    await deleteTicket.mutateAsync(ticket.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleGeneratePRD = async () => {
    await generatePRD.mutateAsync(ticket.id);
  };

  const handleSavePRD = async (content: string) => {
    await updateTicket.mutateAsync({ id: ticket.id, data: { prdContent: content } });
    setIsEditingPRD(false);
  };

  const handleApproveAndLaunch = async () => {
    await approvePRD.mutateAsync(ticket.id);
  };

  const handleMarkComplete = async () => {
    await updateTicket.mutateAsync({ id: ticket.id, data: { status: 'completed' } });
  };

  const handleCleanup = async () => {
    if (ralphInstance) {
      await cleanupWorktree.mutateAsync(ralphInstance.id);
    }
  };

  const handleCleanupAll = async () => {
    if (ralphInstance) {
      await cleanupAll.mutateAsync(ralphInstance.id);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? 'bg-black/50 opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 h-full w-full max-w-lg bg-neutral-900 border-l border-neutral-800 z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              aria-label="Delete ticket"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Title */}
          <div className="mb-4">
            {isEditingTitle ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setEditTitle(ticket.title);
                      setIsEditingTitle(false);
                    }
                  }}
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={updateTicket.isPending}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-xl font-bold cursor-pointer hover:text-blue-400 transition-colors"
              >
                {ticket.title}
              </h2>
            )}
          </div>

          {/* Project badge */}
          {project && (
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-xs bg-neutral-800 text-neutral-300 rounded">
                {project.name}
              </span>
            </div>
          )}

          {/* Status dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-400 mb-2">Status</label>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TICKET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {/* Timestamps */}
          <div className="mb-6 flex gap-6 text-sm text-neutral-500">
            <div>
              <span className="text-neutral-400">Created:</span>{' '}
              {formatRelativeTime(ticket.createdAt)}
            </div>
            <div>
              <span className="text-neutral-400">Updated:</span>{' '}
              {formatRelativeTime(ticket.updatedAt)}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-400">Description</label>
              {!isEditingDescription && (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditingDescription ? (
              <div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full h-32 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setEditDescription(ticket.description);
                      setIsEditingDescription(false);
                    }}
                    className="px-3 py-1 text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={updateTicket.isPending}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-neutral-300 whitespace-pre-wrap">
                {ticket.description || 'No description'}
              </p>
            )}
          </div>

          {/* Attachments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-400 mb-2">Attachments</label>
            <ImageUpload
              ticketId={ticket.id}
              images={images}
              onUpload={handleUpload}
              onDelete={handleDeleteImage}
              isUploading={uploadImage.isPending}
            />
          </div>

          {/* PRD Section */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">PRD</label>

            {/* Backlog status - no PRD actions */}
            {ticket.status === 'backlog' && (
              <p className="text-neutral-500 text-sm italic">
                Move ticket to "Up Next" to generate a PRD.
              </p>
            )}

            {/* Up Next status - Generate PRD button */}
            {ticket.status === 'up_next' && (
              <div>
                {ticket.prdContent ? (
                  <div className="p-3 bg-neutral-800 rounded-lg max-h-64 overflow-y-auto">
                    <PRDViewer content={ticket.prdContent} />
                  </div>
                ) : (
                  <button
                    onClick={handleGeneratePRD}
                    disabled={generatePRD.isPending}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                  >
                    {generatePRD.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating PRD...
                      </span>
                    ) : (
                      'Generate PRD'
                    )}
                  </button>
                )}
                {generatePRD.isError && (
                  <p className="mt-2 text-red-400 text-sm">
                    {generatePRD.error?.message || 'Failed to generate PRD'}
                  </p>
                )}
              </div>
            )}

            {/* In Review status - View/Edit PRD + Approve button */}
            {ticket.status === 'in_review' && ticket.prdContent && (
              <div>
                {isEditingPRD ? (
                  <PRDEditor
                    content={ticket.prdContent}
                    onSave={handleSavePRD}
                    onCancel={() => setIsEditingPRD(false)}
                    isSaving={updateTicket.isPending}
                  />
                ) : (
                  <>
                    <div className="p-3 bg-neutral-800 rounded-lg max-h-64 overflow-y-auto mb-3">
                      <PRDViewer
                        content={ticket.prdContent}
                        onEdit={() => setIsEditingPRD(true)}
                      />
                    </div>
                    <button
                      onClick={handleApproveAndLaunch}
                      disabled={approvePRD.isPending}
                      className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                    >
                      {approvePRD.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Approving...
                        </span>
                      ) : (
                        'Approve & Launch RALPH'
                      )}
                    </button>
                    {approvePRD.isError && (
                      <p className="mt-2 text-red-400 text-sm">
                        {approvePRD.error?.message || 'Failed to approve PRD'}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* In Progress - Log viewer + Read-only PRD */}
            {ticket.status === 'in_progress' && (
              <div className="space-y-4">
                {/* RALPH Progress Logs */}
                {ralphInstance && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-400">RALPH Progress</span>
                      {ticket.branchName && (
                        <code className="text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-300">
                          {ticket.branchName}
                        </code>
                      )}
                    </div>
                    <div className="h-64 border border-neutral-700 rounded-lg overflow-hidden">
                      <RalphLogViewer
                        logs={logs}
                        status={ralphStatus}
                        isConnected={isConnected}
                        error={logsError}
                      />
                    </div>
                  </div>
                )}

                {/* PRD Content */}
                {ticket.prdContent ? (
                  <div className="p-3 bg-neutral-800 rounded-lg max-h-48 overflow-y-auto">
                    <PRDViewer content={ticket.prdContent} />
                  </div>
                ) : (
                  <p className="text-neutral-500 text-sm italic">No PRD generated.</p>
                )}
              </div>
            )}

            {/* In Testing - Review branch and cleanup */}
            {ticket.status === 'in_testing' && (
              <div className="space-y-4">
                {/* Branch info */}
                {ticket.branchName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-400">Branch:</span>
                    <code className="text-sm bg-neutral-800 px-2 py-1 rounded">{ticket.branchName}</code>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkComplete}
                    disabled={updateTicket.isPending}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                  >
                    {updateTicket.isPending ? 'Updating...' : 'Mark as Complete'}
                  </button>
                  <button
                    onClick={handleCleanup}
                    disabled={cleanupWorktree.isPending || !ralphInstance}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 disabled:cursor-not-allowed rounded-lg transition-colors"
                    title="Remove worktree but keep branch"
                  >
                    {cleanupWorktree.isPending ? 'Cleaning...' : 'Cleanup Worktree'}
                  </button>
                </div>

                {(cleanupWorktree.isError || cleanupAll.isError) && (
                  <p className="text-red-400 text-sm">
                    {cleanupWorktree.error?.message || cleanupAll.error?.message || 'Cleanup failed'}
                  </p>
                )}

                <p className="text-xs text-neutral-500">
                  Review the branch, merge if satisfied, then mark complete. "Cleanup Worktree" removes the worktree but keeps the branch for merging.
                </p>

                {/* PRD Content */}
                {ticket.prdContent && (
                  <div className="p-3 bg-neutral-800 rounded-lg max-h-48 overflow-y-auto">
                    <PRDViewer content={ticket.prdContent} />
                  </div>
                )}
              </div>
            )}

            {/* Completed - Read-only PRD */}
            {ticket.status === 'completed' && (
              <div>
                {ticket.prdContent ? (
                  <div className="p-3 bg-neutral-800 rounded-lg max-h-64 overflow-y-auto">
                    <PRDViewer content={ticket.prdContent} />
                  </div>
                ) : (
                  <p className="text-neutral-500 text-sm italic">No PRD generated.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        title="Delete Ticket"
        message={`Are you sure you want to delete "${ticket.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isOpen={showDeleteConfirm}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
