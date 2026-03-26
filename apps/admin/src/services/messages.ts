import { apiClient } from "@/lib/api-client";

export interface Message {
  id: string;
  sessionId: string;
  senderPersonaId: string;
  role: string;
  content: string;
  roundNumber: number;
  createdAt: string;
  senderPersona?: { id: string; name: string };
}

export interface MessageListParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedList<T> {
  items: T[];
  nextCursor: string | null;
}

export const messagesApi = {
  list: (sessionId: string, params?: MessageListParams) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return apiClient.get<PaginatedList<Message>>(
      `/admin/sessions/${sessionId}/messages${query ? `?${query}` : ""}`,
    );
  },
  delete: (messageId: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/messages/${messageId}`),
};
