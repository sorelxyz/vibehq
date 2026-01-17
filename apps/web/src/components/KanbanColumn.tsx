import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Ticket, TicketStatus, Project } from '@vibehq/shared';
import SortableTicketCard from './SortableTicketCard';

interface KanbanColumnProps {
  status: TicketStatus;
  tickets: Ticket[];
  projects: Project[];
  onTicketClick: (ticket: Ticket) => void;
  isLast?: boolean;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  backlog: 'Backlog',
  up_next: 'Up Next',
  in_review: 'In Review',
  in_progress: 'In Progress',
  in_testing: 'In Testing',
  completed: 'Completed',
};

const STATUS_ICONS: Record<TicketStatus, React.ReactNode> = {
  backlog: (
    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  up_next: (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
  in_review: (
    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  in_progress: (
    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  in_testing: (
    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  completed: (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function KanbanColumn({ status, tickets, projects, onTicketClick, isLast = false }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const getProject = (projectId: string) => projects.find(p => p.id === projectId);

  return (
    <div
      className={`flex flex-col w-[280px] min-w-[280px] rounded-lg transition-colors ${
        isOver ? 'ring-2 ring-blue-500 bg-gray-50 dark:bg-neutral-800' : ''
      }`}
    >
      <div className={`flex items-center gap-2 p-3 ${!isLast ? 'border-r border-gray-200 dark:border-neutral-700' : ''}`}>
        {STATUS_ICONS[status]}
        <h3 className="font-semibold text-gray-900 dark:text-neutral-100">{STATUS_LABELS[status]}</h3>
        <span className="ml-auto text-sm text-gray-500 dark:text-neutral-500 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
          {tickets.length}
        </span>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-neutral-600 py-4">No tickets</p>
          ) : (
            tickets.map((ticket) => {
              const project = getProject(ticket.projectId);
              return (
                <SortableTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => onTicketClick(ticket)}
                  projectName={project?.name}
                  projectColor={project?.color}
                />
              );
            })
          )}
        </SortableContext>
      </div>
    </div>
  );
}
