import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Ticket, CreateTicketInput, UpdateTicketInput, TicketStatus } from '@vibehq/shared';

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTicketInput }) =>
      api.patch<Ticket>(`/tickets/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tickets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: TicketStatus; position: number }) =>
      api.patch<Ticket>(`/tickets/${id}/status`, { status, position }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useReorderTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Array<{ id: string; status: TicketStatus; position: number }>) =>
      api.post('/tickets/reorder', { updates }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  });
}
