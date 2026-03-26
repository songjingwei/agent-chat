import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Admin {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    admin: Admin;
  }) => void;
  clearAuth: () => void;
  refresh: () => Promise<void>;
}

const BASE_URL =
  import.meta.env.VITE_API_ORIGIN ?? "http://localhost:3001";

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      admin: null,
      isAuthenticated: false,

      setAuth: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          admin: data.admin,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          admin: null,
          isAuthenticated: false,
        }),

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const res = await fetch(`${BASE_URL}/admin/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          get().clearAuth();
          throw new Error("Refresh failed");
        }

        const json = (await res.json()) as {
          success: boolean;
          data: {
            accessToken: string;
            refreshToken: string;
            admin: Admin;
          };
        };

        if (json.success && json.data) {
          set({
            accessToken: json.data.accessToken,
            refreshToken: json.data.refreshToken,
            admin: json.data.admin,
          });
        } else {
          get().clearAuth();
          throw new Error("Refresh failed");
        }
      },
    }),
    {
      name: "agent-admin-auth",
    },
  ),
);
