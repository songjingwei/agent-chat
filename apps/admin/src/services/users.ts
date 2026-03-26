import { apiClient } from "@/lib/api-client";
import type { BatchResult } from "@/lib/batch-feedback";

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserListParams {
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface PaginatedList<T> {
  items: T[];
  nextCursor: string | null;
}

export const usersApi = {
  list: (params?: UserListParams) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString();
    return apiClient.get<PaginatedList<User>>(
      `/admin/users${query ? `?${query}` : ""}`,
    );
  },
  get: (userId: string) => apiClient.get<User>(`/admin/users/${userId}`),
  update: (userId: string, body: Partial<User>) =>
    apiClient.patch<User>(`/admin/users/${userId}`, body),
  delete: (userId: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/users/${userId}`),
  restore: (userId: string) =>
    apiClient.post<User>(`/admin/users/${userId}/restore`),
  batch: (body: { action: "delete" | "restore"; userIds: string[] }) =>
    apiClient.post<BatchResult<"delete" | "restore">>("/admin/users/batch", body),
};
