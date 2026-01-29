import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Ticket } from '@vibehq/shared';
import { useTickets } from '../hooks/useTickets';
import { useProjects } from '../hooks/useProjects';
import KanbanBoard from '../components/KanbanBoard';
import TicketDetailPanel from '../components/TicketDetailPanel';
import NewTicketModal from '../components/NewTicketModal';
import ManageProjectsModal from '../components/ManageProjectsModal';
import { ThemeToggle } from '../components/ThemeToggle';

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showManageProjectsModal, setShowManageProjectsModal] = useState(false);

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: tickets, isLoading: ticketsLoading } = useTickets();

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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-neutral-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100">VibeHQ</h2>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setShowManageProjectsModal(true)}
            className="px-3 py-1.5 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full text-sm transition-colors"
          >
            Manage Projects
          </button>
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
          >
            New Ticket
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`flex flex-col w-[280px] min-w-[280px] animate-pulse ${i < 5 ? 'border-r border-gray-200 dark:border-neutral-800' : ''}`}>
              <div className="p-3">
                <div className="h-5 bg-gray-200 dark:bg-neutral-800 rounded w-24" />
              </div>
              <div className="p-2 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-20 bg-gray-200 dark:bg-neutral-800 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
          tickets={tickets || []}
          projects={projects || []}
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
      />

      <ManageProjectsModal
        isOpen={showManageProjectsModal}
        onClose={() => setShowManageProjectsModal(false)}
      />
    </div>
  );
}
