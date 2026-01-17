import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TICKET_STATUSES, type Ticket, type TicketStatus, type Project } from '@vibehq/shared';
import KanbanColumn from './KanbanColumn';
import TicketCard from './TicketCard';
import { useUpdateTicketStatus, useReorderTickets } from '../hooks/useTickets';

interface KanbanBoardProps {
  tickets: Ticket[];
  projects: Project[];
  onTicketClick: (ticket: Ticket) => void;
}

export default function KanbanBoard({ tickets, projects, onTicketClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const updateStatus = useUpdateTicketStatus();
  const reorderTickets = useReorderTickets();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getTicketsByStatus = (status: TicketStatus) => {
    return tickets
      .filter((ticket) => ticket.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const activeTicket = activeId ? tickets.find(t => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by column's isOver state
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTicket = tickets.find(t => t.id === active.id);
    if (!activeTicket) return;

    const overId = over.id as string;

    // Check if dropped on a column (status)
    const isOverColumn = TICKET_STATUSES.includes(overId as TicketStatus);

    if (isOverColumn) {
      const newStatus = overId as TicketStatus;
      if (activeTicket.status !== newStatus) {
        // Moving to a different column - place at end
        const targetTickets = getTicketsByStatus(newStatus);
        const newPosition = targetTickets.length > 0
          ? Math.max(...targetTickets.map(t => t.position)) + 1
          : 0;

        updateStatus.mutate({ id: activeTicket.id, status: newStatus, position: newPosition });
      }
    } else {
      // Dropped on another ticket
      const overTicket = tickets.find(t => t.id === overId);
      if (!overTicket) return;

      if (activeTicket.status !== overTicket.status) {
        // Moving to different column at specific position
        updateStatus.mutate({
          id: activeTicket.id,
          status: overTicket.status,
          position: overTicket.position
        });
      } else if (activeTicket.id !== overTicket.id) {
        // Reordering within same column
        const columnTickets = getTicketsByStatus(activeTicket.status);
        const activeIndex = columnTickets.findIndex(t => t.id === activeTicket.id);
        const overIndex = columnTickets.findIndex(t => t.id === overTicket.id);

        if (activeIndex !== overIndex) {
          const updates = columnTickets.map((ticket, index) => {
            if (ticket.id === activeTicket.id) {
              return { id: ticket.id, status: ticket.status, position: overIndex };
            }
            if (activeIndex < overIndex) {
              // Moving down: shift tickets between old and new position up
              if (index > activeIndex && index <= overIndex) {
                return { id: ticket.id, status: ticket.status, position: index - 1 };
              }
            } else {
              // Moving up: shift tickets between new and old position down
              if (index >= overIndex && index < activeIndex) {
                return { id: ticket.id, status: ticket.status, position: index + 1 };
              }
            }
            return { id: ticket.id, status: ticket.status, position: index };
          });

          reorderTickets.mutate(updates);
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
        {TICKET_STATUSES.map((status, index) => (
          <KanbanColumn
            key={status}
            status={status}
            tickets={getTicketsByStatus(status)}
            projects={projects}
            onTicketClick={onTicketClick}
            isLast={index === TICKET_STATUSES.length - 1}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTicket ? (
          (() => {
            const project = projects.find(p => p.id === activeTicket.projectId);
            return (
              <TicketCard
                ticket={activeTicket}
                onClick={() => {}}
                isDragging
                projectName={project?.name}
                projectColor={project?.color}
              />
            );
          })()
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
