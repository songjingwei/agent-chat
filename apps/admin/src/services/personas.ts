import { apiClient } from "@/lib/api-client";

export interface Persona {
  id: string;
  userId: string;
  name: string;
  bio: string | null;
  status: string;
  version: number;
  systemPrompt: string | null;
  traits: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user?: { id: string; email: string; displayName: string };
}

export interface PersonaListParams {
  cursor?: string;
  limit?: number;
  status?: string;
  userId?: string;
}

export interface PaginatedList<T> {
  items: T[];
  nextCursor: string | null;
}

export const personasApi = {
  list: (params?: PersonaListParams) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    if (params?.userId) qs.set("userId", params.userId);
    const query = qs.toString();
    return apiClient.get<PaginatedList<Persona>>(
      `/admin/personas${query ? `?${query}` : ""}`,
    );
  },
  get: (personaId: string) =>
    apiClient.get<Persona>(`/admin/personas/${personaId}`),
  update: (personaId: string, body: Partial<Persona>) =>
    apiClient.patch<Persona>(`/admin/personas/${personaId}`, body),
  delete: (personaId: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/personas/${personaId}`),
  restore: (personaId: string) =>
    apiClient.post<Persona>(`/admin/personas/${personaId}/restore`),
};
