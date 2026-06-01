"use client";

import { useDashboard } from "@/hooks/queries";
import { PageHeader, LoadingState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { data, isLoading } = useDashboard();

  return (
    <div>
      <PageHeader title="Análises" description="Métricas do assistente" />
      {isLoading || !data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Total de conversas" value={data.total_conversations} />
              <Row label="Mensagens hoje" value={data.messages_today} />
              <Row label="Sessões ativas" value={data.active_sessions} />
              <Row label="Handoffs" value={data.handoffs} />
              <Row label="Reservas" value={data.bookings} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Serviços populares</CardTitle>
            </CardHeader>
            <CardContent>
              {data.top_services.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.top_services.map((s) => (
                    <li key={s.service_name} className="flex justify-between">
                      <span>{s.service_name}</span>
                      <span className="font-medium">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
