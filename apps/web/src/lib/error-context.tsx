"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { formatApiError } from "./api";

interface AppErrorContextValue {
  error: string | null;
  setError: (message: string | null) => void;
  runWithErrorHandling: <T>(action: () => Promise<T>) => Promise<T | undefined>;
}

const AppErrorContext = createContext<AppErrorContextValue | null>(null);

export function AppErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  const runWithErrorHandling = useCallback(async <T,>(action: () => Promise<T>) => {
    setError(null);
    try {
      return await action();
    } catch (err) {
      setError(formatApiError(err));
      return undefined;
    }
  }, []);

  const value = useMemo(
    () => ({ error, setError, runWithErrorHandling }),
    [error, runWithErrorHandling]
  );

  return <AppErrorContext.Provider value={value}>{children}</AppErrorContext.Provider>;
}

export function useAppError(): AppErrorContextValue {
  const context = useContext(AppErrorContext);
  if (!context) {
    throw new Error("useAppError must be used within AppErrorProvider");
  }
  return context;
}
