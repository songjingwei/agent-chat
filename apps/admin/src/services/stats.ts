import { apiClient } from "@/lib/api-client";

export interface StatsOverview {
  totalUsers: number;
  totalPersonas: number;
  totalSessions: number;
  totalMessages: number;
}

export const statsApi = {
  overview: () => apiClient.get<StatsOverview>("/admin/stats/overview"),
};
