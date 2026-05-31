"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAuth } from "@/lib/auth-context";
import { useAppError } from "@/lib/error-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const { runWithErrorHandling } = useAppError();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await runWithErrorHandling(async () => {
      await login(email, password);
      router.replace("/");
    });
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Access your family diary. Observations only — no medical advice.
          </p>
        </div>
        <ErrorBanner />
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>
          <button className="btn btn-primary w-full" disabled={submitting} type="submit">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
