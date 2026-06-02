"use client";

import { useAppError } from "@/lib/error-context";

export function ErrorBanner() {
  const { error, setError } = useAppError();
  if (!error) return null;

  return (
    <div className="alert alert-error mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="font-semibold">Request failed</div>
        <div className="text-sm">{error}</div>
      </div>
      <button className="btn btn-secondary px-3 py-1 text-sm" onClick={() => setError(null)} type="button">
        Dismiss
      </button>
    </div>
  );
}
