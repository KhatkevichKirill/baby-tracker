"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function ChildRequiredNotice() {
  const { childId } = useAuth();

  if (childId) return null;

  return (
    <div className="alert alert-info mb-4">
      Select or create a child profile before using this screen.{" "}
      <Link className="font-semibold underline" href="/child">
        Go to child profile
      </Link>
    </div>
  );
}

export function useHasChild(): boolean {
  return Boolean(useAuth().childId);
}
