import { apiClient } from "@/lib/api-client";
import type { BatchResult } from "@/lib/batch-feedback";

export interface MemoryItem {
  id: string;
  personaId: string;
  category: string;
  source: string;
  weight: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryListParams {
  cursor?: string;
  limit?: number;
  personaId?: string;
  category?: string;
  source?: string;
}

export interface PaginatedList<T> {
  items: T[];
  nextCursor: string | null;
}

export const memoryApi = {
  list: (params?: MemoryListParams) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.personaId) qs.set("personaId", params.personaId);
    if (params?.category) qs.set("category", params.category);
    if (params?.source) qs.set("source", params.source);
    const query = qs.toString();
    return apiClient.get<PaginatedList<MemoryItem>>(
      `/admin/memory-items${query ? `?${query}` : ""}`,
    );
  },
  update: (memoryId: string, body: Partial<MemoryItem>) =>
    apiClient.patch<MemoryItem>(`/admin/memory-items/${memoryId}`, body),
  delete: (memoryId: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/memory-items/${memoryId}`),
  batch: (body:
    | { action: "delete"; memoryIds: string[] }
    | {
        action: "update";
        memoryIds: string[];
        category?: "fact" | "preference" | "experience" | "instruction";
        weight?: number;
        content?: string;
      }) =>
    apiClient.post<BatchResult<"delete" | "update">>(
      "/admin/memory-items/batch",
      body,
    ),
};
