import type { Ticket, TicketStatus } from '@vibehq/shared';

interface TicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  isDragging?: boolean;
}

const STATUS_BORDER_COLORS: Record<TicketStatus, string> = {
  backlog: 'border-l-neutral-500',
  up_next: 'border-l-blue-500',
  in_review: 'border-l-yellow-500',
  in_progress: 'border-l-purple-500',
  in_testing: 'border-l-orange-500',
  completed: 'border-l-green-500',
};

export default function TicketCard({ ticket, onClick, isDragging }: TicketCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        p-3 bg-gray-100 dark:bg-neutral-800 rounded-md border-l-4 cursor-pointer
        hover:bg-gray-200 dark:hover:bg-neutral-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-neutral-900/50
        transition-all duration-150
        ${STATUS_BORDER_COLORS[ticket.status]}
        ${isDragging ? 'opacity-50 shadow-xl scale-105' : ''}
      `}
    >
      <h4 className="font-medium text-gray-900 dark:text-neutral-100 line-clamp-2">{ticket.title}</h4>
      {ticket.description && (
        <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400 line-clamp-2">{ticket.description}</p>
      )}
    </div>
  );
}
