"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "@/components/sidebar";
import { LoadingState } from "@/components/ui/misc";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for zustand to hydrate from localStorage before deciding.
    if (token === null) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [token, router]);

  if (!ready) return <LoadingState />;

  return (
    <div className="flex">
      <Sidebar />
      <main className="h-screen flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
