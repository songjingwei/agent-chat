import { apiClient } from "@/lib/api-client";
import type { BatchResult } from "@/lib/batch-feedback";
import type { SortOrder, TimeSortBy } from "@/lib/time-sort";

export interface ConfigItem {
  id: string;
  configKey: string;
  configValue: string;
  valueType: "string" | "number" | "boolean" | "json";
  description: string | null;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigListParams {
  sortBy?: TimeSortBy;
  sortOrder?: SortOrder;
}

export const configApi = {
  list: (params?: ConfigListParams) => {
    const qs = new URLSearchParams();
    if (params?.sortBy) qs.set("sortBy", params.sortBy);
    if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
    const query = qs.toString();
    return apiClient.get<{ items: ConfigItem[] }>(
      `/admin/configs${query ? `?${query}` : ""}`,
    );
  },
  upsert: (
    key: string,
    body: {
      configValue: string;
      valueType: "string" | "number" | "boolean" | "json";
      description?: string;
      isSecret?: boolean;
    },
  ) =>
    apiClient.put<ConfigItem>(`/admin/configs/${key}`, body),
  delete: (key: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/configs/${key}`),
  batchDelete: (configKeys: string[]) =>
    apiClient.post<BatchResult<"delete">>("/admin/configs/batch", {
      action: "delete",
      configKeys,
    }),
};
