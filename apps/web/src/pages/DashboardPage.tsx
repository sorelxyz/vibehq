import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Ticket } from '@vibehq/shared';
import { useTickets } from '../hooks/useTickets';
import { useProjects } from '../hooks/useProjects';
import KanbanBoard from '../components/KanbanBoard';
import TicketDetailPanel from '../components/TicketDetailPanel';
import NewTicketModal from '../components/NewTicketModal';

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: tickets, isLoading: ticketsLoading } = useTickets(selectedProjectId);

  // Sync URL with selected ticket
  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId) {
      setSelectedTicketId(ticketId);
    }
  }, [searchParams]);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
    setSearchParams({ ticket: ticket.id });
  };

  const handleClosePanel = () => {
    setSelectedTicketId(null);
    setSearchParams({});
  };

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId || !tickets) return null;
    return tickets.find((t) => t.id === selectedTicketId) || null;
  }, [selectedTicketId, tickets]);

  const selectedProject = useMemo(() => {
    if (!selectedTicket || !projects) return null;
    return projects.find((p) => p.id === selectedTicket.projectId) || null;
  }, [selectedTicket, projects]);

  const isLoading = projectsLoading || ticketsLoading;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
          >
            New Ticket
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[280px] min-w-[280px] bg-neutral-900 rounded-lg animate-pulse">
              <div className="p-3 border-b border-neutral-800">
                <div className="h-5 bg-neutral-800 rounded w-24" />
              </div>
              <div className="p-2 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-20 bg-neutral-800 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
          tickets={tickets || []}
          onTicketClick={handleTicketClick}
        />
      )}

      <TicketDetailPanel
        ticket={selectedTicket}
        project={selectedProject}
        isOpen={!!selectedTicketId}
        onClose={handleClosePanel}
      />

      <NewTicketModal
        isOpen={showNewTicketModal}
        onClose={() => setShowNewTicketModal(false)}
        projects={projects || []}
        defaultProjectId={selectedProjectId}
      />
    </div>
  );
}
