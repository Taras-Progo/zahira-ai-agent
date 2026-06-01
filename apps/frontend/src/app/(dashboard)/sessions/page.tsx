"use client";

import { useSessions } from "@/hooks/queries";
import { PageHeader, LoadingState, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default function SessionsPage() {
  const { data, isLoading } = useSessions();

  return (
    <div>
      <PageHeader
        title="Sessões"
        description="Sessões ativas e encerradas, com duração e status"
      />
      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Nenhuma sessão registrada." />
      ) : (
        <div className="grid gap-2">
          {data.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{s.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    Início: {formatDate(s.started_at)} · Última atividade:{" "}
                    {formatDate(s.last_activity_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {s.message_count} msgs
                  </span>
                  <Badge tone={s.status === "ACTIVE" ? "green" : "default"}>
                    {s.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
