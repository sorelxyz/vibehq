import type { Ticket, TicketStatus } from '@vibehq/shared';
import TicketCard from './TicketCard';

interface KanbanColumnProps {
  status: TicketStatus;
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: 'Backlog',
  up_next: 'Up Next',
  in_review: 'In Review',
  in_progress: 'In Progress',
  in_testing: 'In Testing',
  completed: 'Completed',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  backlog: 'bg-neutral-500',
  up_next: 'bg-blue-500',
  in_review: 'bg-yellow-500',
  in_progress: 'bg-purple-500',
  in_testing: 'bg-orange-500',
  completed: 'bg-green-500',
};

export default function KanbanColumn({ status, tickets, onTicketClick }: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-[280px] min-w-[280px] bg-neutral-900 rounded-lg">
      <div className="flex items-center gap-2 p-3 border-b border-neutral-800">
        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
        <h3 className="font-semibold text-neutral-100">{STATUS_LABELS[status]}</h3>
        <span className="ml-auto text-sm text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
          {tickets.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tickets.length === 0 ? (
          <p className="text-center text-sm text-neutral-600 py-4">No tickets</p>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketClick(ticket)}
            />
          ))
        )}
      </div>
    </div>
  );
}
