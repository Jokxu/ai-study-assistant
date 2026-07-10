import { create } from "zustand";
import { authApi, type User } from "@/services/api";

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: false,

  login: async (username, password) => {
    set({ loading: true });
    try {
      const res = await authApi.login({ username, password });
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));
      set({ token: res.access_token, user: res.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  register: async (username, email, password) => {
    set({ loading: true });
    try {
      await authApi.register({ username, email, password });
      set({ loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      set({ token, user: JSON.parse(userStr) });
    }
  },
}));