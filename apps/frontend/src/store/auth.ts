import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminPublic } from "@zahira/types";

interface AuthState {
  token: string | null;
  admin: AdminPublic | null;
  setAuth: (token: string, admin: AdminPublic) => void;
  setToken: (token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      setAuth: (token, admin) => set({ token, admin }),
      setToken: (token) => set({ token }),
      clear: () => set({ token: null, admin: null }),
    }),
    { name: "zahira-auth" },
  ),
);
