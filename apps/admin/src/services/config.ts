import { apiClient } from "@/lib/api-client";
import type { BatchResult } from "@/lib/batch-feedback";

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

export const configApi = {
  list: () => apiClient.get<{ items: ConfigItem[] }>("/admin/configs"),
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
