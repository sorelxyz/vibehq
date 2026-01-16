import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Ticket } from '@vibehq/shared';
import TicketCard from './TicketCard';

interface SortableTicketCardProps {
  ticket: Ticket;
  onClick: () => void;
}

export default function SortableTicketCard({ ticket, onClick }: SortableTicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}
