"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/timeline", label: "Timeline" },
  { href: "/events/new", label: "Add event" },
  { href: "/drafts", label: "Drafts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/child", label: "Child" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, families, childId, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Loading session…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="text-lg font-bold">Baby Tracker</div>
            <div className="text-sm text-[var(--muted)]">
              {user.displayName}
              {families[0] ? ` · ${families[0].name}` : ""}
              {childId ? ` · child selected` : " · no child selected"}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={logout} type="button">
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg)] text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
