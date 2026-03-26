import { apiClient } from "@/lib/api-client";

export interface ConfigItem {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export const configApi = {
  list: () => apiClient.get<ConfigItem[]>("/admin/configs"),
  upsert: (key: string, body: { value: string; description?: string }) =>
    apiClient.put<ConfigItem>(`/admin/configs/${key}`, body),
  delete: (key: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/configs/${key}`),
};
