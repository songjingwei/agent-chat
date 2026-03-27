import { apiClient } from "@/lib/api-client";
import type { BatchResult } from "@/lib/batch-feedback";
import type { SortOrder, TimeSortBy } from "@/lib/time-sort";

export interface Report {
  id: string;
  sessionId: string;
  status: string;
  compatibilityScore: number | null;
  summary: string | null;
  recommendation: string | null;
  analysisData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListParams {
  cursor?: string;
  limit?: number;
  status?: string;
  sortBy?: TimeSortBy;
  sortOrder?: SortOrder;
}

export interface PaginatedList<T> {
  items: T[];
  nextCursor: string | null;
}

export const reportsApi = {
  list: (params?: ReportListParams) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    if (params?.sortBy) qs.set("sortBy", params.sortBy);
    if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
    const query = qs.toString();
    return apiClient.get<PaginatedList<Report>>(
      `/admin/reports${query ? `?${query}` : ""}`,
    );
  },
  get: (reportId: string) =>
    apiClient.get<Report>(`/admin/reports/${reportId}`),
  delete: (reportId: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/reports/${reportId}`),
  batchDelete: (reportIds: string[]) =>
    apiClient.post<BatchResult<"delete">>("/admin/reports/batch", {
      action: "delete",
      reportIds,
    }),
};
