import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Ticket, CreateTicketInput, UpdateTicketInput, TicketStatus, RalphInstance } from '@vibehq/shared';

export function useTickets(projectId?: string) {
  return useQuery({
    queryKey: ['tickets', { projectId }],
    queryFn: () => api.get<Ticket[]>(projectId ? `/tickets?projectId=${projectId}` : '/tickets'),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () => api.get<Ticket>(`/tickets/${id}`),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketInput) => api.post<Ticket>('/tickets', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' }),
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTicketInput }) =>
      api.patch<Ticket>(`/tickets/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' }),
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tickets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' }),
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: TicketStatus; position: number }) =>
      api.patch<Ticket>(`/tickets/${id}/status`, { status, position }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' }),
  });
}

export function useReorderTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Array<{ id: string; status: TicketStatus; position: number }>) =>
      api.post('/tickets/reorder', { updates }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' }),
  });
}

export function useGeneratePRD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await fetch(`/api/tickets/${ticketId}/generate-prd`, { method: 'POST' });
      if (!res.ok) {
        // Handle empty response body gracefully
        const text = await res.text();
        if (text) {
          try {
            const error = JSON.parse(text);
            throw new Error(error.error || 'Failed to generate PRD');
          } catch {
            throw new Error(text || 'Failed to generate PRD');
          }
        }
        throw new Error(`Failed to generate PRD (${res.status})`);
      }
      return res.json() as Promise<Ticket>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' });
    },
  });
}

export function useApprovePRD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await fetch(`/api/tickets/${ticketId}/approve`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to approve PRD');
      }
      return res.json() as Promise<Ticket>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchType: 'active' });
    },
  });
}

export function useRalphInstance(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['ralph-instance', ticketId],
    queryFn: () => api.get<RalphInstance>(`/tickets/${ticketId}/ralph`),
    enabled: !!ticketId,
    retry: false, // Don't retry on 404
  });
}

export function useCleanupWorktree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const res = await fetch(`/api/ralph/${instanceId}/cleanup`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to cleanup worktree');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ralph-instance'] });
    },
  });
}

export function useCleanupAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const res = await fetch(`/api/ralph/${instanceId}/cleanup-all`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to cleanup');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ralph-instance'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

interface DevServerStatus {
  running: boolean;
  port: number | null;
  url: string | null;
}

export function useDevServerStatus(instanceId: string | undefined) {
  return useQuery({
    queryKey: ['dev-server', instanceId],
    queryFn: () => api.get<DevServerStatus>(`/ralph/${instanceId}/dev-server`),
    enabled: !!instanceId,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useStartDevServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const res = await fetch(`/api/ralph/${instanceId}/dev-server`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start dev server');
      }
      return res.json() as Promise<{ port: number | null; url: string | null }>;
    },
    onSuccess: (_, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ['dev-server', instanceId] });
    },
  });
}

export function useStopDevServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const res = await fetch(`/api/ralph/${instanceId}/dev-server`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to stop dev server');
      }
      return res.json();
    },
    onSuccess: (_, instanceId) => {
      queryClient.invalidateQueries({ queryKey: ['dev-server', instanceId] });
    },
  });
}
