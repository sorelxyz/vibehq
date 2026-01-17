import type { Ticket } from '@vibehq/shared';

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  isDragging?: boolean;
  projectName?: string;
  projectColor?: string;
}

export default function TicketCard({ ticket, onClick, isDragging, projectName, projectColor }: TicketCardProps) {
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
    </div>
  );
}
