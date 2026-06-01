"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Wrench,
  BookOpen,
  MessagesSquare,
  Brain,
  CalendarCheck,
  LifeBuoy,
  Activity,
  FileText,
  Settings,
  BarChart3,
  Radio,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-test", label: "Painel de Teste IA", icon: Sparkles },
  { href: "/services", label: "Serviços", icon: Wrench },
  { href: "/knowledge", label: "Base de Conhecimento", icon: BookOpen },
  { href: "/conversations", label: "Conversas", icon: MessagesSquare },
  { href: "/sessions", label: "Sessões", icon: Radio },
  { href: "/memory", label: "Memórias", icon: Brain },
  { href: "/bookings", label: "Reservas", icon: CalendarCheck },
  { href: "/support", label: "Suporte", icon: LifeBuoy },
  { href: "/prompts", label: "Prompts", icon: FileText },
  { href: "/analytics", label: "Análises", icon: BarChart3 },
  { href: "/health", label: "Saúde do Sistema", icon: Activity },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAuthStore((s) => s.admin);
  const clear = useAuthStore((s) => s.clear);

  async function logout() {
    await api.post("/auth/logout").catch(() => undefined);
    clear();
    router.replace("/login");
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-semibold">Zahira AI</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium">{admin?.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {admin?.email}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
