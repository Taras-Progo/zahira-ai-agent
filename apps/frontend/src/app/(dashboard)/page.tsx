"use client";

import {
  MessagesSquare,
  Radio,
  Send,
  LifeBuoy,
  CalendarCheck,
} from "lucide-react";
import { useDashboard } from "@/hooks/queries";
import { StatCard } from "@/components/stat-card";
import { PageHeader, LoadingState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do assistente de IA da Zahira"
      />
      {isLoading || !data ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Conversas"
              value={data.total_conversations}
              icon={MessagesSquare}
            />
            <StatCard
              label="Mensagens hoje"
              value={data.messages_today}
              icon={Send}
            />
            <StatCard
              label="Sessões ativas"
              value={data.active_sessions}
              icon={Radio}
            />
            <StatCard label="Handoffs" value={data.handoffs} icon={LifeBuoy} />
            <StatCard
              label="Reservas"
              value={data.bookings}
              icon={CalendarCheck}
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Serviços mais procurados</CardTitle>
            </CardHeader>
            <CardContent>
              {data.top_services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ainda não há dados suficientes.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.top_services.map((s) => (
                    <li
                      key={s.service_name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{s.service_name}</span>
                      <span className="font-medium">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
