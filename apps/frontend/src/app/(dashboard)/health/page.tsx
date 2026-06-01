"use client";

import { Database, Server, Cpu, ListChecks } from "lucide-react";
import type { HealthComponent } from "@zahira/types";
import { useHealth } from "@/hooks/queries";
import { PageHeader, LoadingState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusTone: Record<string, "green" | "amber" | "red"> = {
  ok: "green",
  degraded: "amber",
  down: "red",
};

function Component({
  label,
  icon: Icon,
  comp,
  extra,
}: {
  label: string;
  icon: typeof Database;
  comp: HealthComponent;
  extra?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              {comp.latency_ms != null ? `${comp.latency_ms} ms` : ""} {extra}
            </p>
          </div>
        </div>
        <Badge tone={statusTone[comp.status] ?? "default"}>{comp.status}</Badge>
      </CardContent>
    </Card>
  );
}

export default function HealthPage() {
  const { data, isLoading } = useHealth();

  return (
    <div>
      <PageHeader
        title="Saúde do Sistema"
        description="Status dos componentes em tempo real (atualiza a cada 15s)"
      />
      {isLoading || !data ? (
        <LoadingState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Component label="Banco de dados" icon={Database} comp={data.components.database} />
          <Component label="Redis" icon={Server} comp={data.components.redis} />
          <Component label="OpenAI" icon={Cpu} comp={data.components.openai} />
          <Component
            label="Fila de jobs"
            icon={ListChecks}
            comp={data.components.queue}
            extra={
              data.components.queue.depth != null
                ? `· ${data.components.queue.depth} na fila`
                : ""
            }
          />
        </div>
      )}
    </div>
  );
}
