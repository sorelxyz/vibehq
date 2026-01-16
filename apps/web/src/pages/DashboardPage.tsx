import { useState } from 'react';
import type { Ticket } from '@vibehq/shared';
import { useTickets } from '../hooks/useTickets';
import { useProjects } from '../hooks/useProjects';
import KanbanBoard from '../components/KanbanBoard';

export default function DashboardPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: tickets, isLoading: ticketsLoading } = useTickets(selectedProjectId);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

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
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors">
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

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-2">{selectedTicket.title}</h3>
            <p className="text-neutral-400 mb-4">{selectedTicket.description}</p>
            <p className="text-sm text-neutral-500 mb-4">Status: {selectedTicket.status}</p>
            <button
              onClick={() => setSelectedTicket(null)}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-md font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
