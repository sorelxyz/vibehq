import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TicketImage } from '@vibehq/shared';

export function useImages(ticketId: string) {
  return useQuery({
    queryKey: ['images', ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}/images`);
      if (!res.ok) throw new Error('Failed to fetch images');
      return res.json() as Promise<TicketImage[]>;
    },
    enabled: !!ticketId,
  });
}

export function useUploadImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, file }: { ticketId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/tickets/${ticketId}/images`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }
      return res.json() as Promise<TicketImage>;
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['images', ticketId] });
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ticketId }: { id: string; ticketId: string }) => {
      const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      return { id, ticketId };
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['images', ticketId] });
    },
  });
}
