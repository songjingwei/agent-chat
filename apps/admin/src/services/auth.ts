import { apiClient } from "@/lib/api-client";

export const adminAuthApi = {
  login: (username: string, password: string) =>
    apiClient.post("/admin/auth/login", { username, password }),
  refresh: (refreshToken: string) =>
    apiClient.post("/admin/auth/refresh", { refreshToken }),
  logout: (refreshToken: string) =>
    apiClient.post("/admin/auth/logout", { refreshToken }),
  me: () => apiClient.get("/admin/auth/me"),
};
