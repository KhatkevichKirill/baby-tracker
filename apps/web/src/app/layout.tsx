import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { AppErrorProvider } from "@/lib/error-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baby Tracker",
  description: "Family baby diary with structured events and draft review"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppErrorProvider>{children}</AppErrorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
