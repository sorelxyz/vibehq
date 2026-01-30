import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Ticket, Project } from '@vibehq/shared';
import TicketCard from './TicketCard';

interface SortableTicketCardProps {
  ticket: Ticket;
  project?: Project;
  onClick: () => void;
  projectName?: string;
  projectColor?: string;
}

export default function SortableTicketCard({ ticket, project, onClick, projectName, projectColor }: SortableTicketCardProps) {
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
      <TicketCard
        ticket={ticket}
        project={project}
        onClick={onClick}
        isDragging={isDragging}
        projectName={projectName}
        projectColor={projectColor}
      />
    </div>
  );
}
