import { apiClient } from "@/lib/api-client";
import type { BatchResult } from "@/lib/batch-feedback";

export interface Session {
  id: string;
  initiatorPersonaId: string;
  targetPersonaId: string;
  status: string;
  currentRound: number;
  maxRounds: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  initiatorPersona?: { id: string; name: string };
  targetPersona?: { id: string; name: string };
}

export interface SessionListParams {
  cursor?: string;
  limit?: number;
  status?: string;
}

export interface PaginatedList<T> {
  items: T[];
  nextCursor: string | null;
}

export const sessionsApi = {
  list: (params?: SessionListParams) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString();
    return apiClient.get<PaginatedList<Session>>(
      `/admin/sessions${query ? `?${query}` : ""}`,
    );
  },
  get: (sessionId: string) =>
    apiClient.get<Session>(`/admin/sessions/${sessionId}`),
  update: (sessionId: string, body: { status: string }) =>
    apiClient.patch<Session>(`/admin/sessions/${sessionId}`, body),
  delete: (sessionId: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/sessions/${sessionId}`),
  batch: (body:
    | { action: "delete"; sessionIds: string[] }
    | {
        action: "update_status";
        sessionIds: string[];
        status: "pending" | "active" | "paused" | "completed" | "failed";
      }) =>
    apiClient.post<BatchResult<"delete" | "update_status">>(
      "/admin/sessions/batch",
      body,
    ),
};
