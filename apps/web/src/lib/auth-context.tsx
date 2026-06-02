"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { apiFetch } from "./api";
import type { AuthResponse, Family, MeResponse, User } from "./types";

const TOKEN_KEY = "baby-tracker-token";
const CHILD_KEY = "baby-tracker-child-id";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  families: Family[];
  childId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  setChildId: (childId: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function readStoredChildId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CHILD_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [childId, setChildIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback((payload: AuthResponse | MeResponse, nextToken?: string) => {
    if ("token" in payload) {
      localStorage.setItem(TOKEN_KEY, payload.token);
      setToken(payload.token);
    }
    setUser(payload.user);
    setFamilies(payload.families);
  }, []);

  const refreshSession = useCallback(async () => {
    const storedToken = readStoredToken();
    if (!storedToken) {
      setToken(null);
      setUser(null);
      setFamilies([]);
      return;
    }

    const me = await apiFetch<MeResponse>("/auth/me", {}, storedToken);
    setToken(storedToken);
    setUser(me.user);
    setFamilies(me.families);
  }, []);

  useEffect(() => {
    const storedToken = readStoredToken();
    const storedChildId = readStoredChildId();
    setToken(storedToken);
    setChildIdState(storedChildId);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    refreshSession()
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setFamilies([]);
      })
      .finally(() => setLoading(false));
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      applyAuth(response);
      setToken(response.token);
    },
    [applyAuth]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setFamilies([]);
  }, []);

  const setChildId = useCallback((nextChildId: string | null) => {
    if (nextChildId) {
      localStorage.setItem(CHILD_KEY, nextChildId);
    } else {
      localStorage.removeItem(CHILD_KEY);
    }
    setChildIdState(nextChildId);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      families,
      childId,
      loading,
      login,
      logout,
      refreshSession,
      setChildId
    }),
    [token, user, families, childId, loading, login, logout, refreshSession, setChildId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useRequireAuth(): AuthContextValue & { token: string } {
  const auth = useAuth();
  if (!auth.token) {
    throw new Error("Authentication required");
  }
  return auth as AuthContextValue & { token: string };
}
