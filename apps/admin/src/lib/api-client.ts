import { useAuthStore } from "./auth-store";

const BASE_URL =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3001";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { accessToken, refresh, clearAuth } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — attempt token refresh once
  if (res.status === 401 && accessToken) {
    try {
      await refresh();
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${BASE_URL}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
      }
    } catch {
      clearAuth();
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message =
      (errorBody as { error?: { message?: string } })?.error?.message ??
      (errorBody as { message?: string })?.message ??
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (json.success === false) {
    throw new Error(json.message ?? "Unknown API error");
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
