import type { Project, CreateTicketInput, UpdateTicketInput } from '@vibehq/shared';
import { useCreateTicket } from '../hooks/useTickets';
import TicketForm from './TicketForm';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId?: string;
}

export default function NewTicketModal({
  isOpen,
  onClose,
  projects,
  defaultProjectId,
}: NewTicketModalProps) {
  const createTicket = useCreateTicket();

  if (!isOpen) return null;

  const handleSubmit = async (data: CreateTicketInput | UpdateTicketInput) => {
    await createTicket.mutateAsync(data as CreateTicketInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-neutral-900 rounded-lg shadow-xl w-full max-w-md mx-4 border border-neutral-800">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">New Ticket</h2>
          <TicketForm
            projectId={defaultProjectId}
            projects={projects}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={createTicket.isPending}
          />
        </div>
      </div>
    </div>
  );
}
