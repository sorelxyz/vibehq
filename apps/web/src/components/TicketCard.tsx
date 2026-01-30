import type { Ticket, Project } from '@vibehq/shared';
import { getPreviewUrl } from '@vibehq/shared';

interface TicketCardProps {
  ticket: Ticket;
  project?: Project;
  onClick: () => void;
  isDragging?: boolean;
  projectName?: string;
  projectColor?: string;
}

export default function TicketCard({ ticket, project, onClick, isDragging, projectName, projectColor }: TicketCardProps) {
  // Get preview URL if ticket is in testing and has a branch
  const previewUrl = project && ticket.status === 'in_testing' && ticket.branchName
    ? getPreviewUrl(project.deploymentPlatform, project.deploymentProjectName, ticket.branchName)
    : null;

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-3 bg-gray-100 dark:bg-neutral-800 rounded-md border-l-4 cursor-pointer
        hover:bg-gray-200 dark:hover:bg-neutral-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-neutral-900/50
        transition-all duration-150
        ${isDragging ? 'opacity-50 shadow-xl scale-105' : ''}
      `}
      style={{ borderLeftColor: projectColor || '#3b82f6' }}
    >
      {projectName && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: projectColor || '#3b82f6' }}
          />
          <span className="text-xs font-medium text-gray-500 dark:text-neutral-500 truncate">
            {projectName}
          </span>
        </div>
      )}
      <h4 className="font-medium text-gray-900 dark:text-neutral-100 line-clamp-2">{ticket.title}</h4>
      {ticket.description && (
        <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400 line-clamp-2">{ticket.description}</p>
      )}
      
      {/* Preview button for in_testing tickets */}
      {previewUrl && (
        <button
          onClick={handlePreviewClick}
          className="mt-2 flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Preview
        </button>
      )}
    </div>
  );
}
