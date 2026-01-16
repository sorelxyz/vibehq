import { TICKET_STATUSES, type Ticket, type TicketStatus } from '@vibehq/shared';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

export default function KanbanBoard({ tickets, onTicketClick }: KanbanBoardProps) {
  const getTicketsByStatus = (status: TicketStatus) => {
    return tickets
      .filter((ticket) => ticket.status === status)
      .sort((a, b) => a.position - b.position);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
      {TICKET_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tickets={getTicketsByStatus(status)}
          onTicketClick={onTicketClick}
        />
      ))}
    </div>
  );
}
